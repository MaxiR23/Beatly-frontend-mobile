// INFO: the query hook of GET /playlists, the caller's own playlists, paged through the shared infinite-query hook, the mutation of POST /playlists, which refetches the library and the playlists once the playlist exists, the query of GET /playlists/owned-with-track/{id}, and the mutations that add a track to a playlist, create a playlist with a track and remove a track, which refresh the library, the playlists, that playlist and the membership, and the mutations of PATCH and DELETE /playlists/{id}, which refresh the library, the playlists and the recents, and after an edit that playlist's header and the playback source's name, and the editor of an own playlist's tracks, which sends moves and removes through core's sequencer, reloads the tracks after a failure and, when it is left after sending something, refreshes the library, the playlists, that playlist and the membership of the removed tracks.
import {
  createTrackEditor,
  type AddTrackInput,
  type CreatePlaylistInput,
  type PlaylistListItem,
  type UpdatePlaylistInput,
} from "@beatly/core";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { libraryQueryKey } from "./useLibrary.ts";
import { useInfiniteList } from "./useInfiniteList.ts";
import { playlistQueryKey, playlistTracksQueryKey } from "./usePlaylist.ts";
import { recentsQueryKey } from "./useRecents.ts";

export const playlistsQueryKey = ["playlists", "mine"] as const;

export const playlistsWithTrackQueryKey = (trackId: string) =>
  ["playlists", "withTrack", trackId] as const;

export function usePlaylists() {
  const { playlists } = useCore();
  return useInfiniteList({
    queryKey: playlistsQueryKey,
    fetchPage: (cursor) => playlists.listPlaylists(cursor),
  });
}

export function useCreatePlaylist() {
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlaylistInput) => {
      const outcome = await playlists.createPlaylist(input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
        queryClient.invalidateQueries({ queryKey: playlistsQueryKey }),
      ]),
  });
}

export function usePlaylistsWithTrack(trackId: string) {
  const { playlists } = useCore();
  return useQuery({
    queryKey: playlistsWithTrackQueryKey(trackId),
    queryFn: async () => {
      const outcome = await playlists.listPlaylistsWithTrack(trackId);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data.playlist_ids,
  });
}

// The library and the playlists (Home, the picker), that playlist's header and tracks (the prefix of both keys) when known, and which playlists hold the track.
function refreshAfterWrite(
  queryClient: QueryClient,
  playlistId: string | null,
  trackId: string,
): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
    queryClient.invalidateQueries({ queryKey: playlistsQueryKey }),
    ...(playlistId !== null
      ? [queryClient.invalidateQueries({ queryKey: ["playlist", "user", playlistId] })]
      : []),
    queryClient.invalidateQueries({ queryKey: playlistsWithTrackQueryKey(trackId) }),
  ]);
}

export function useAddToPlaylist() {
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playlist,
      input,
    }: {
      playlist: PlaylistListItem;
      input: AddTrackInput;
    }) => {
      const outcome = await playlists.addTrackToPlaylist(playlist.id, input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    onSuccess: (_data, { playlist, input }) =>
      refreshAfterWrite(queryClient, playlist.id, input.track_id),
  });
}

export function useCreatePlaylistWithTrack() {
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, input }: { title: string; input: AddTrackInput }) => {
      const outcome = await playlists.createPlaylistWithTrack(title, input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data.playlist;
    },
    // Settled, not success: a playlist created but left empty still appears.
    onSettled: (_data, _error, { input }) => refreshAfterWrite(queryClient, null, input.track_id),
  });
}

export function useRemoveFromPlaylist() {
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const outcome = await playlists.removeTrackFromPlaylist(playlistId, trackId);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
    },
    onSuccess: (_data, { playlistId, trackId }) =>
      refreshAfterWrite(queryClient, playlistId, trackId),
  });
}

export function useUpdatePlaylist() {
  const { playlists, playback } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdatePlaylistInput }) => {
      const outcome = await playlists.updatePlaylist(id, input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    // The player's "playing from" shows the new title at once; the controller ignores it unless this playlist is the source.
    onSuccess: (updated, { id }) => {
      playback.renameSource({ kind: "playlist", id }, updated.title);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
        queryClient.invalidateQueries({ queryKey: playlistsQueryKey }),
        // Exact: the tracks key shares this prefix and an edit does not change them.
        queryClient.invalidateQueries({ queryKey: playlistQueryKey("user", id), exact: true }),
        queryClient.invalidateQueries({ queryKey: recentsQueryKey }),
      ]);
    },
  });
}

export function useDeletePlaylist() {
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const outcome = await playlists.deletePlaylist(id);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
    },
    // Not the deleted playlist's own queries: the screen is still mounted until it goes back, and a refetch would draw its not-found state for a frame.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
        queryClient.invalidateQueries({ queryKey: playlistsQueryKey }),
        queryClient.invalidateQueries({ queryKey: recentsQueryKey }),
      ]),
  });
}

export function usePlaylistTrackEditor(playlistId: string) {
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  const [editor] = useState(() => createTrackEditor(playlists, playlistId));
  // Leaving (Done, back, swipe or hardware back): once the queue settles, refresh what the edits changed, only when something was sent.
  useEffect(
    () => () => {
      void editor.idle().then(({ sent, removed }) => {
        if (sent === 0) return;
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
          queryClient.invalidateQueries({ queryKey: playlistsQueryKey }),
          // The prefix of the header (count, duration, mosaic) and the tracks.
          queryClient.invalidateQueries({ queryKey: ["playlist", "user", playlistId] }),
          ...removed.map((trackId) =>
            queryClient.invalidateQueries({ queryKey: playlistsWithTrackQueryKey(trackId) }),
          ),
        ]);
      });
    },
    [editor, queryClient, playlistId],
  );
  return {
    move: (fromIndex: number, toIndex: number) =>
      editor.apply({ kind: "move", fromIndex, toIndex }),
    remove: (trackId: string) => editor.apply({ kind: "remove", trackId }),
    idle: () => editor.idle(),
    // After a failure: once the queue settles, accept edits again and drop the tracks query to its first page, so the screen loads every page again.
    reload: async () => {
      await editor.idle();
      editor.reset();
      await queryClient.resetQueries({ queryKey: playlistTracksQueryKey("user", playlistId) });
    },
  };
}
