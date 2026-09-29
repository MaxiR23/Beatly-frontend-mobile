// INFO: the shared infinite-query hook: every growable list pages through it; cache time comes from the pages' max-age via the QueryClient, and pages before an invalid_cursor restart are dropped.
import type { HttpOutcome, PageResult } from "@beatly/core";
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";

import { OutcomeError } from "./outcomeError.ts";

const FIRST_PAGE: string | null = null;

export function useInfiniteList<T>(options: {
  queryKey: QueryKey;
  fetchPage: (cursor: string | null) => Promise<HttpOutcome<PageResult<T>>>;
}) {
  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    initialPageParam: FIRST_PAGE,
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

  return { ...query, loadMore };
}
