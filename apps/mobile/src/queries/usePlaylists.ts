// INFO: the query hook of GET /playlists, the caller's own playlists, paged through the shared infinite-query hook.
import { useCore } from "../providers/CoreProvider.tsx";
import { useInfiniteList } from "./useInfiniteList.ts";

export const playlistsQueryKey = ["playlists", "mine"] as const;

export function usePlaylists() {
  const { playlists } = useCore();
  return useInfiniteList({
    queryKey: playlistsQueryKey,
    fetchPage: (cursor) => playlists.listPlaylists(cursor),
  });
}
