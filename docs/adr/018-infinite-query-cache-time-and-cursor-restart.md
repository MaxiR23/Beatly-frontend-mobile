# 018. Infinite query cache time and cursor restart

How the cache time of a paginated list is derived and what happens to the
loaded pages when the cursor is discarded.

## Context

`005-tanstack-query-with-cache-control-times.md` derives `staleTime` from the
`maxAgeSeconds` of the outcome a query returns. An infinite query holds many
pages, each with its own max-age, and a refetch of it refetches every loaded
page. A 422 `invalid_cursor` makes the paginated helper restart from the first
page, flagged as `restartedFromFirstPage` on the page result.

## Decision

- `staleTimeFor` reads the pages of an infinite query and uses the smallest
  `maxAgeSeconds` among them: an infinite refetch refetches every page, so the
  shortest max-age is the one that decides when the data is stale.
- `useInfiniteList` drops the pages that come before a `restartedFromFirstPage`
  page, in `select`, so the list shows the restarted first page onward and never
  mixes pages from two cursors.
- Rejected for the cache time: the first page's max-age (a later, shorter page
  would be served stale) and the last page's (the same problem in reverse).
- Rejected for the restart: resetting the query (it drops the list to loading
  and loses scroll position instead of swapping the pages).

## Consequences

- No cache time is a literal in any hook; the rule of 005 holds for lists.
- The restart rule lives on `PageResult.restartedFromFirstPage` and in the hook,
  and a change to either updates this record.
