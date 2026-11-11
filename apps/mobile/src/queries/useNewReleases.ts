// INFO: the query hook of GET /releases, the new releases, paged through the shared infinite-query hook; cache time comes from the pages' max-age via the QueryClient.
import { useCore } from "../providers/CoreProvider.tsx";
import { useInfiniteList } from "./useInfiniteList.ts";

export const newReleasesQueryKey = ["releases"] as const;

export function useNewReleases() {
  const { releases } = useCore();
  return useInfiniteList({
    queryKey: newReleasesQueryKey,
    fetchPage: (cursor) => releases.listReleases(cursor),
  });
}
