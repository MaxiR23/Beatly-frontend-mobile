# 005. TanStack Query with cache times from Cache-Control

Why server state in the UI goes through TanStack Query, why every cache
time comes from the backend's `Cache-Control` header and never from a
literal, and why user data is invalidated on mutation.

## Context

The legacy app reimplemented loading, error and refetch in every
screen, and cached responses in async storage with a key that included
a version number fetched from a backend endpoint at start. That
endpoint no longer exists, and the new contract offers neither
versions nor ETags. What the backend does have is a cache of the
external provider's responses with a fixed time per route, from one
hour for search to twenty-four for an album. The client cannot see
those times unless the response carries them.

Two failure modes to avoid: a client that re-fetches an album the
backend cached for a day, and a client that hardcodes "24 hours" and
goes stale the day the backend changes it.

## Decision

- All server state in the UI is a TanStack Query query or mutation
  over a `core` service. Screens never hold fetched data in their own
  state.
- The HTTP client in `core` exposes the `Cache-Control` max-age of
  every response. `staleTime` is derived once, in the `defaultOptions`
  of `createQueryClient`, from the `maxAgeSeconds` of the core
  `Success` outcome that a query function returns as its data (the
  screen unwraps it with `select`). An infinite query's data has no
  `maxAgeSeconds`, so under this default it is always stale; the
  shared infinite-query hook decides that when it is written. A hook
  never writes a `staleTime` or `gcTime` literal.
- A response without `Cache-Control` gets the client's single
  documented default, defined once in `core`'s HTTP module. A route
  that should be cached longer and does not send the header is a
  backend issue, opened from the plan, never a number in a hook.
- User data (likes, playlists, library, profile, recents, bug reports)
  is invalidated on mutation by query key. The list of keys a mutation
  invalidates lives next to the mutation and follows the contract's
  own description of what each write affects.
- Persisting the query cache to storage is not part of V1.

## Consequences

- Every query hook ships with a test that proves its `staleTime` comes
  from the response header (`docs/testing.md`).
- Cache freshness is the backend's knob. Changing how long an album is
  served from cache is one header change and zero client releases.
- Mutations are optimistic only where the plan says so, always with a
  rollback; the default is invalidate and refetch.

Why the alternatives were rejected:

- Hand-written hooks over a key-value cache: the legacy design, one
  loading/error implementation per screen and an invalidation scheme
  that depended on an endpoint that is gone.
- Per-route cache times in the client: duplicates knowledge the
  backend owns and drifts silently.
- Conditional requests with ETag and 304: the contract does not offer
  them, and adding them to the backend for a mobile client that reads
  `Cache-Control` buys little.
- Offline persistence from the start: a second source of truth before
  the first is proven. Revisited with the offline vertical, if V2 has
  one.
