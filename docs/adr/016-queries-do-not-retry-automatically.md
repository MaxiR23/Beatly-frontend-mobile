# 016. Queries do not retry automatically

Why `createQueryClient` sets `retry: false` for every query, and why the
error state's retry button is the only retry.

## Context

The HTTP client gives every request a 15 second budget, covering the
token read and the send. TanStack Query retries a failed query three
times by default, with an exponential delay between attempts (1, 2 and
4 seconds). With a network that never answers, the worst case is four
attempts of 15 seconds plus 7 seconds of delay: about 67 seconds before
the screen leaves its loading state and draws the error. The budget
the client promises the user is 15 seconds.

A failed outcome is also usually not transient in a way a blind retry
fixes: an `ok: false` reason is a stable answer from the backend, and
the screen maps it to a message.

## Decision

- `createQueryClient` in `apps/mobile/src/queries/queryClient.ts` sets
  `retry: false` in the default options of queries.
- An error reaches the screen after one attempt, within the client's
  15 seconds.
- Every screen draws an error state with a retry action that calls
  `refetch`. The user decides when to try again.
- A query that needs automatic retries sets them in its own hook with a
  reason written next to the option, and the total time it can take
  stays inside what the screen is willing to show as loading.

## Consequences

- The time to the error state is bounded by the HTTP client's timeout,
  not multiplied by the library's retry policy.
- A short network drop shows the error state instead of recovering
  silently; the retry button is one tap away.
- The cache-time rule of `005-tanstack-query-with-cache-control-times.md`
  is unchanged: `staleTime` still comes from `Cache-Control`.

Why the alternatives were rejected:

- Keeping the default three retries: 67 seconds of spinner in the worst
  case, against a 15 second budget.
- Fewer retries with a shorter delay: it still multiplies the budget by
  the number of attempts, and the error state already offers a retry.
