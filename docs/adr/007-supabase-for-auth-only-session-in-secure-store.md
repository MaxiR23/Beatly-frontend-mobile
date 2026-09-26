# 007. Supabase for auth only; session in expo-secure-store

Why the client uses Supabase to authenticate and for nothing else, why
every other byte goes through the backend API, and why the session is
stored in `expo-secure-store`.

## Context

The legacy app read the `profiles` table directly for the username,
inserted playback errors into an `error_logs` table with the anon key,
and kept the Supabase session, access and refresh tokens included, in
plain async storage. Each direct table access is a second contract to
maintain, invisible to the backend's docs, and dependent on row-level
security being exactly right for a client that holds a public key.

The backend's contract already covers the profile (`GET /profile/me`)
and takes the JWT as a bearer token on every authenticated route.

## Decision

- Supabase is used for sign in, sign up, sign out, session refresh and
  the deep-link callback. Nothing else: no table read, no table write,
  no storage bucket, no RPC.
- It is reached through the `auth` port: the current access token, the
  three sign operations and a session change stream.
  `apps/mobile/src/adapters/auth.ts` is the only file that imports
  `@supabase/*`.
- The adapter stores the session with a storage adapter over
  `expo-secure-store`, splitting values above the platform's size limit
  into chunks. Async storage never holds a token.
- The HTTP client in `core` reads the token from the port and sets the
  `Authorization` header. No other code sees the token.
- A valid session without a profile row (the contract's 404
  `profile_not_found`) is a state the session start handles, not a
  crash.

## Consequences

- Row-level security on the backend's tables is not a client concern:
  the client cannot reach a table.
- Playback error logging has no client destination in V1. If it is
  wanted, it is an API route, opened as a backend issue.
- The email shown in the profile screen comes from the session, as the
  contract's profile does not carry it.
- Logout clears the secure store and the query cache in one place, the
  auth adapter and the app's session provider, so no user data survives
  into the next session.

Why the alternatives were rejected:

- Keeping direct table access for "just the username": every exception
  is a second contract, and the API already serves it.
- Async storage for the session: plain text on disk, on a device that
  may be shared or backed up.
- A custom auth service in the backend: the backend validates Supabase
  JWTs locally today; replacing that buys nothing and adds a password
  store to a repo that does not want one.
