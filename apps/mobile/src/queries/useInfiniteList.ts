// INFO: the shared infinite-query hook: every growable list pages through it; cache time comes from the pages' max-age via the QueryClient, a caller can disable it, and a disabled list never fetches; and pages before an invalid_cursor restart are dropped; loadAll fetches every remaining page.
import type { HttpOutcome, PageResult } from "@beatly/core";
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";

import { OutcomeError } from "./outcomeError.ts";

const FIRST_PAGE: string | null = null;

export function useInfiniteList<T>(options: {
  queryKey: QueryKey;
  fetchPage: (cursor: string | null) => Promise<HttpOutcome<PageResult<T>>>;
  enabled?: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    initialPageParam: FIRST_PAGE,
    enabled: options.enabled ?? true,
    queryFn: async ({ pageParam }) => {
      const outcome = await options.fetchPage(pageParam);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    getNextPageParam: (last) =>
      last.data.page.has_more ? (last.data.page.next_cursor ?? undefined) : undefined,
    select: (data) => {
      const restart = data.pages.findLastIndex((page) => page.data.restartedFromFirstPage);
      return data.pages.slice(Math.max(restart, 0)).flatMap((page) => page.data.items);
    },
  });

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  };

  // Every remaining page, then the whole list; a failed page leaves the query in error. The caller
  // can stop it between pages (its screen went away); nothing is returned to start from then.
  const loadAll = async (
    isCancelled: () => boolean = () => false,
  ): Promise<{ kind: "loaded"; items: T[] } | { kind: "failed" } | { kind: "cancelled" }> => {
    let current = query;
    while (current.hasNextPage) {
      if (isCancelled()) return { kind: "cancelled" };
      current = await query.fetchNextPage({ cancelRefetch: false });
      if (current.isError) return { kind: "failed" };
    }
    if (isCancelled()) return { kind: "cancelled" };
    return current.data !== undefined
      ? { kind: "loaded", items: current.data }
      : { kind: "failed" };
  };

  return { ...query, loadMore, loadAll };
}
