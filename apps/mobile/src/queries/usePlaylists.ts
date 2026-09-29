// INFO: the query hook of GET /playlists, the caller's own playlists, paged through the shared infinite-query hook, and the mutation of POST /playlists, which refetches the library and the playlists once the playlist exists.
import type { CreatePlaylistInput } from "@beatly/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { libraryQueryKey } from "./useLibrary.ts";
import { useInfiniteList } from "./useInfiniteList.ts";

export const playlistsQueryKey = ["playlists", "mine"] as const;

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
