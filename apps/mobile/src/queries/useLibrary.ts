// INFO: the query hook of GET /library, the caller's unified library, paged through the shared infinite-query hook.
import { useCore } from "../providers/CoreProvider.tsx";
import { useInfiniteList } from "./useInfiniteList.ts";

export const libraryQueryKey = ["library"] as const;

export function useLibrary() {
  const { library } = useCore();
  return useInfiniteList({
    queryKey: libraryQueryKey,
    fetchPage: (cursor) => library.listLibrary(cursor),
  });
}
