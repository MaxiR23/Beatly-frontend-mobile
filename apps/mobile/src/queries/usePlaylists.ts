// INFO: the query hook of GET /playlists, the caller's own playlists, paged through the shared infinite-query hook, the mutation of POST /playlists, which refetches the library and the playlists once the playlist exists, the query of GET /playlists/owned-with-track/{id}, and the mutations that add a track to a playlist, create a playlist with a track and remove a track, which refresh the library, the playlists, that playlist and the membership, and the mutations of PATCH and DELETE /playlists/{id}, which refresh the library, the playlists and the recents, and after an edit that playlist's header.
import type {
  AddTrackInput,
  CreatePlaylistInput,
  PlaylistListItem,
  UpdatePlaylistInput,
} from "@beatly/core";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { libraryQueryKey } from "./useLibrary.ts";
import { useInfiniteList } from "./useInfiniteList.ts";
import { playlistQueryKey } from "./usePlaylist.ts";
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
  const { playlists } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdatePlaylistInput }) => {
      const outcome = await playlists.updatePlaylist(id, input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
        queryClient.invalidateQueries({ queryKey: playlistsQueryKey }),
        // Exact: the tracks key shares this prefix and an edit does not change them.
        queryClient.invalidateQueries({ queryKey: playlistQueryKey("user", id), exact: true }),
        queryClient.invalidateQueries({ queryKey: recentsQueryKey }),
      ]),
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
