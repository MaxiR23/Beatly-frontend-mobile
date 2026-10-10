// INFO: the playlists service: the caller's own playlists, a page at a time, over the shared paginated helper, one playlist or the liked one with its tracks, the creation of a playlist, which playlists hold a track, adding a track to one (an already added track counts as added), creating one with a track, moving a track, removing a track, a sequencer that sends a playlist's moves and removes one at a time, in order, and drops the rest after a failure, renaming or describing one, and deleting one (an already deleted playlist counts as deleted).
import { z } from "zod";

import {
  likedPlaylistSchema,
  ownedPlaylistIdsSchema,
  playlistDetailSchema,
  playlistListItemSchema,
  playlistSchema,
  playlistTrackSchema,
  type Playlist,
  type LikedPlaylist,
  type PlaylistDetail,
  type PlaylistListItem,
  type OwnedPlaylistIds,
  type PlaylistTrack,
} from "../domain/playlist.ts";
import type { HttpClient } from "../http/client.ts";
import type { ApiFailure, HttpOutcome, TransportFailure } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";
import type { PlayArtist } from "./activity.ts";
import type { PlayableTrack } from "./playback.ts";

export interface CreatePlaylistInput {
  readonly title: string;
  readonly description?: string;
  readonly is_public: boolean;
}

// Only the keys present are written; description null clears it, a title is never null.
export interface UpdatePlaylistInput {
  readonly title?: string;
  readonly description?: string | null;
}

export interface AddTrackInput {
  readonly track_id: string;
  readonly title: string;
  // Non-empty, every id set: the contract's TrackArtist.id is required.
  readonly artists: readonly PlayArtist[];
  readonly album: string;
  readonly album_id: string;
  readonly thumbnail_url: string;
  readonly duration_seconds: number;
}

export interface AddTrackResult {
  // True when the backend said the track was already in the playlist: the same end state as added.
  readonly alreadyThere: boolean;
}

// The body POST /playlists/{id}/tracks requires, or null when the track lacks a field of it.
export function addTrackInputOf(track: PlayableTrack): AddTrackInput | null {
  const artists: PlayArtist[] = [];
  for (const artist of track.artists) {
    if (artist.id !== null) artists.push({ id: artist.id, name: artist.name });
  }
  if (
    track.album === null ||
    track.albumId === null ||
    track.coverUrl === null ||
    track.durationSeconds === null ||
    artists.length === 0
  ) {
    return null;
  }
  return {
    track_id: track.trackId,
    title: track.title,
    artists,
    album: track.album,
    album_id: track.albumId,
    thumbnail_url: track.coverUrl,
    duration_seconds: track.durationSeconds,
  };
}

export interface PlaylistsService {
  listPlaylists(cursor: string | null): Promise<HttpOutcome<PageResult<PlaylistListItem>>>;
  createPlaylist(input: CreatePlaylistInput): Promise<HttpOutcome<Playlist>>;
  listPlaylistsWithTrack(trackId: string): Promise<HttpOutcome<OwnedPlaylistIds>>;
  addTrackToPlaylist(
    playlistId: string,
    input: AddTrackInput,
  ): Promise<HttpOutcome<AddTrackResult>>;
  createPlaylistWithTrack(
    title: string,
    input: AddTrackInput,
  ): Promise<HttpOutcome<{ readonly playlist: Playlist }>>;
  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<HttpOutcome<null>>;
  moveTrack(
    playlistId: string,
    oldPosition: number,
    newPosition: number,
  ): Promise<HttpOutcome<null>>;
  updatePlaylist(id: string, input: UpdatePlaylistInput): Promise<HttpOutcome<Playlist>>;
  deletePlaylist(id: string): Promise<HttpOutcome<null>>;
  getPlaylist(id: string): Promise<HttpOutcome<PlaylistDetail>>;
  listPlaylistTracks(
    id: string,
    cursor: string | null,
  ): Promise<HttpOutcome<PageResult<PlaylistTrack>>>;
  getLikedPlaylist(): Promise<HttpOutcome<LikedPlaylist>>;
  listLikedTracks(cursor: string | null): Promise<HttpOutcome<PageResult<PlaylistTrack>>>;
}

export function createPlaylistsService(client: HttpClient): PlaylistsService {
  const createPlaylist: PlaylistsService["createPlaylist"] = ({ title, description, is_public }) =>
    client.request({
      method: "POST",
      path: "/playlists",
      body: { title, is_public, ...(description !== undefined ? { description } : {}) },
      schema: playlistSchema,
    });
  const addTrackToPlaylist: PlaylistsService["addTrackToPlaylist"] = async (playlistId, input) => {
    const outcome = await client.request({
      method: "POST",
      path: `/playlists/${encodeURIComponent(playlistId)}/tracks`,
      body: input,
      schema: playlistTrackSchema,
    });
    if (outcome.kind === "success") {
      return {
        kind: "success",
        data: { alreadyThere: false },
        maxAgeSeconds: outcome.maxAgeSeconds,
      };
    }
    if (outcome.kind === "api_failure" && outcome.reason === "track_already_in_playlist") {
      return { kind: "success", data: { alreadyThere: true }, maxAgeSeconds: 0 };
    }
    return outcome;
  };
  const deletePlaylist: PlaylistsService["deletePlaylist"] = async (id) => {
    const outcome = await client.request({
      method: "DELETE",
      path: `/playlists/${encodeURIComponent(id)}`,
      schema: z.null(),
    });
    if (outcome.kind === "api_failure" && outcome.reason === "playlist_not_found") {
      // Already deleted: the state the user asked for.
      return { kind: "success", data: null, maxAgeSeconds: 0 };
    }
    return outcome;
  };
  return {
    listPlaylists: (cursor) =>
      fetchPage(client, { path: "/playlists", item: playlistListItemSchema, cursor }),
    createPlaylist,
    listPlaylistsWithTrack: (trackId) =>
      client.request({
        path: `/playlists/owned-with-track/${encodeURIComponent(trackId)}`,
        schema: ownedPlaylistIdsSchema,
      }),
    addTrackToPlaylist,
    createPlaylistWithTrack: async (title, input) => {
      const created = await createPlaylist({ title, is_public: false });
      if (created.kind !== "success") return created;
      const added = await addTrackToPlaylist(created.data.id, input);
      if (added.kind !== "success") return added;
      return { kind: "success", data: { playlist: created.data }, maxAgeSeconds: 0 };
    },
    removeTrackFromPlaylist: (playlistId, trackId) =>
      client.request({
        method: "DELETE",
        path: `/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
        schema: z.null(),
      }),
    moveTrack: (playlistId, oldPosition, newPosition) =>
      client.request({
        method: "POST",
        path: `/playlists/${encodeURIComponent(playlistId)}/move-track`,
        body: { old_position: oldPosition, new_position: newPosition },
        schema: z.null(),
      }),
    updatePlaylist: (id, input) =>
      client.request({
        method: "PATCH",
        path: `/playlists/${encodeURIComponent(id)}`,
        body: input,
        schema: playlistSchema,
      }),
    deletePlaylist,
    getPlaylist: (id) =>
      client.request({
        path: `/playlists/${encodeURIComponent(id)}`,
        schema: playlistDetailSchema,
      }),
    listPlaylistTracks: (id, cursor) =>
      fetchPage(client, {
        path: `/playlists/${encodeURIComponent(id)}/tracks`,
        item: playlistTrackSchema,
        cursor,
      }),
    getLikedPlaylist: () =>
      client.request({ path: "/playlists/liked", schema: likedPlaylistSchema }),
    listLikedTracks: (cursor) =>
      fetchPage(client, { path: "/playlists/liked/tracks", item: playlistTrackSchema, cursor }),
  };
}

// An edit of a fully loaded playlist: indices are zero-based in the list as it stood when the edit was made.
export type TrackEdit =
  | { readonly kind: "move"; readonly fromIndex: number; readonly toIndex: number }
  | { readonly kind: "remove"; readonly trackId: string };

export type TrackEditResult =
  | { readonly kind: "saved" }
  | { readonly kind: "unchanged" } // a move to its own index: nothing sent
  | { readonly kind: "failed"; readonly failure: ApiFailure | TransportFailure }
  | { readonly kind: "dropped" }; // behind a failure, before reset(): nothing sent

export interface TrackEditor {
  apply(edit: TrackEdit): Promise<TrackEditResult>;
  // Resolves once every edit applied so far has settled: how many were sent and which track ids were removed.
  idle(): Promise<{ readonly sent: number; readonly removed: readonly string[] }>;
  // Accepts edits again after a failure, once the caller has reloaded the server order.
  reset(): void;
}

export function createTrackEditor(
  service: Pick<PlaylistsService, "moveTrack" | "removeTrackFromPlaylist">,
  playlistId: string,
): TrackEditor {
  let tail: Promise<unknown> = Promise.resolve();
  let failed = false;
  let sent = 0;
  const removed: string[] = [];
  const run = async (edit: TrackEdit): Promise<TrackEditResult> => {
    if (failed) return { kind: "dropped" };
    if (edit.kind === "move" && edit.fromIndex === edit.toIndex) return { kind: "unchanged" };
    sent += 1;
    if (edit.kind === "remove") removed.push(edit.trackId);
    const outcome =
      edit.kind === "move"
        ? await service.moveTrack(playlistId, edit.fromIndex + 1, edit.toIndex + 1)
        : await service.removeTrackFromPlaylist(playlistId, edit.trackId);
    if (outcome.kind !== "success") {
      failed = true;
      return { kind: "failed", failure: outcome };
    }
    return { kind: "saved" };
  };
  return {
    apply: (edit) => {
      const result = tail.then(() => run(edit));
      tail = result;
      return result;
    },
    idle: async () => {
      await tail;
      return { sent, removed: [...removed] };
    },
    reset: () => {
      failed = false;
    },
  };
}
