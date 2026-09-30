// INFO: the playlists service: the caller's own playlists, a page at a time, over the shared paginated helper, one playlist or the liked one with its tracks, and the creation of a playlist.
import {
  likedPlaylistSchema,
  playlistDetailSchema,
  playlistListItemSchema,
  playlistSchema,
  playlistTrackSchema,
  type Playlist,
  type LikedPlaylist,
  type PlaylistDetail,
  type PlaylistListItem,
  type PlaylistTrack,
} from "../domain/playlist.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface CreatePlaylistInput {
  readonly title: string;
  readonly description?: string;
  readonly is_public: boolean;
}

export interface PlaylistsService {
  listPlaylists(cursor: string | null): Promise<HttpOutcome<PageResult<PlaylistListItem>>>;
  createPlaylist(input: CreatePlaylistInput): Promise<HttpOutcome<Playlist>>;
  getPlaylist(id: string): Promise<HttpOutcome<PlaylistDetail>>;
  listPlaylistTracks(
    id: string,
    cursor: string | null,
  ): Promise<HttpOutcome<PageResult<PlaylistTrack>>>;
  getLikedPlaylist(): Promise<HttpOutcome<LikedPlaylist>>;
  listLikedTracks(cursor: string | null): Promise<HttpOutcome<PageResult<PlaylistTrack>>>;
}

export function createPlaylistsService(client: HttpClient): PlaylistsService {
  return {
    listPlaylists: (cursor) =>
      fetchPage(client, { path: "/playlists", item: playlistListItemSchema, cursor }),
    createPlaylist: ({ title, description, is_public }) =>
      client.request({
        method: "POST",
        path: "/playlists",
        body: { title, is_public, ...(description !== undefined ? { description } : {}) },
        schema: playlistSchema,
      }),
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
