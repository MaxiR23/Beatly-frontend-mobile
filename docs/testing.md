# Testing

Conventions for tests in this repo.

## Commands

    pnpm test                                   run all tests, every workspace
    pnpm --filter @beatly/core test             vitest, core only
    pnpm --filter @beatly/core test -- <pattern>
    pnpm --filter @beatly/core test --coverage  vitest with the v8 coverage report
    pnpm --filter @beatly/ui test               vitest, ui only
    pnpm --filter @beatly/mobile test           jest-expo, mobile only

Coverage is available in `core` only: `@vitest/coverage-v8` is in its
`devDependencies`. The other workspaces have no coverage provider, and
a `--coverage` flag there fails until one is added. The flag goes
without a `--` before it: `test -- --coverage` hands vitest a filter,
not the flag, and runs the tests with no report.

## Runners

Two runners, chosen by what the code imports, not by preference:

- **vitest** in `packages/core`. Node, no React Native preset, no
  simulator. `core` imports neither `react` nor `react-native` nor
  `expo-*`, so nothing in it needs more than Node. If a test in `core`
  needs jest-expo, the code under test is in the wrong package.
  `packages/ui` runs the same vitest setup with `passWithNoTests`
  until it has tests, so `pnpm test` covers every workspace; its first
  component test brings jest-expo with it, in the same change.
- **jest-expo** in `apps/mobile`, and in `packages/ui` once it has a
  component test, only for code that renders or touches a native
  module. A pure helper that happens to live in `apps/mobile` still
  gets a plain unit test. `describe` / `it` / `expect` come from
  explicit `@jest/globals` imports in each test file, not from ambient
  types, so `tsconfig.base.json` keeps `"types": []`.
  `@testing-library/react-native` stays on the 13.x line: 14.x
  requires the separate `test-renderer` package in place of
  `react-test-renderer`, which is not adopted yet.

## File location

Tests live in a `test/` directory at the root of each workspace,
mirroring its `src/`. In `apps/mobile`, `test/` also mirrors `app/`:
expo-router routes get their test under `test/app/`, not `test/src/`.

    packages/core/src/services/playlists.ts   -> packages/core/test/services/playlists.test.ts
    packages/core/src/http/client.ts          -> packages/core/test/http/client.test.ts
    packages/ui/src/components/TrackRow.tsx   -> packages/ui/test/components/TrackRow.test.tsx
    apps/mobile/src/queries/usePlaylists.ts   -> apps/mobile/test/queries/usePlaylists.test.tsx
    apps/mobile/app/index.tsx                 -> apps/mobile/test/app/index.test.tsx

Fakes for the ports live in `packages/core/test/fakes/`, one file per
port, and are imported by the other workspaces' tests through the
package. Cross-cutting tests that do not map to a single module live
at the root of the workspace's `test/`, for example
`apps/mobile/test/i18n-parity.test.ts`.

## Naming

Test names describe the behavior being verified, not a category:

    it("returns the first page when the caller has playlists")
    it("returns an empty first page when the caller has none")
    it("surfaces playlist_not_found as an api failure")
    it("fails with a timeout outcome when the API does not answer")

The name should be enough to know what broke when it fails.

## Coverage per service

Every service function that calls the API ships with four tests:

1. Success with data. Asserts the parsed shape, not just that the call
   happened.
2. Expected empty state:
   - Paginated endpoints: first page with `items: []`,
     `has_more: false`, `next_cursor: null`, `total: 0`, returned as a
     success, never as a failure.
   - Everything else: whatever the contract defines as empty (`null`,
     `[]`, three empty lists), also as a success.
3. API failure with the `reason` the screen branches on, returned as a
   typed outcome. Test the reasons the domain file lists for that
   route, not every reason in the contract.
4. Transport failure: a timeout, a network error, and a body that fails
   the zod schema. Each one is its own typed outcome and never a bare
   throw.

Paginated services ship two more: a second page fetched with the
returned cursor, and a 422 `invalid_cursor` that discards the cursor
and refetches the first page.

## Coverage per screen

A screen is covered by its service tests plus, in `apps/mobile`, a test
per query hook that proves the cache time comes from the response's
`Cache-Control` and not from a literal. Component tests exist only for
components with their own logic: a track row's playing state, a form's
validation, a sheet's internal modes. A component that only maps
props to tokens and other components is not tested on its own.

Two repo-wide tests always run:

- i18n parity: every key in `es` exists in `en` and vice versa, per
  namespace.
- Boundaries: `core` imports nothing from `react`, `react-native`,
  `expo-*` or the other workspaces. ESLint enforces it at lint time;
  the test proves it at test time so a lint config change cannot hide
  a regression.

## File header

Each test file MUST start with this header:

    // packages/core/test/services/playlists.test.ts
    //
    // Tests for the playlists service.
    //
    // Tested:
    // - listPlaylists returns the first page when the caller has playlists
    // - Returns an empty first page when the caller has none
    // - Surfaces playlist_not_found as an api failure
    // - Fails with a timeout outcome when the API does not answer
    //
    // What is covered:
    // - Happy path, expected empty state, api failure, transport failure
    //
    // Run with: pnpm --filter @beatly/core test -- playlists
    //
    // SEE: packages/core/src/services/playlists.ts

This replaces the single-line `// INFO:` rule for test files. The
single-line rule still applies to non-test code.

## Faking the outside world

All HTTP, auth, audio and storage go through a port, and tests fake
the port, never the library. Tests never hit the real API, Supabase or
a device, not even a sandbox.

- `http`: the fake takes handlers per route and returns the raw body
  and headers the real API would. An unhandled route throws, so a
  test can never silently reach a real endpoint. Never mock global
  `fetch` in a service test; the HTTP client's own tests are the only
  place that fakes `fetch`, to prove the timeout and the parsing.
- `auth`: returns a fixed token. Supabase is never imported in a test.
- `player`: an in-memory player with a manual clock, so "30 seconds
  played" is a method call, not a wait.
- `config`, `log`, `storage`: an object literal, an array, a `Map`.

Query hooks are tested with a fresh `QueryClient` per test and the
`http` fake underneath, asserting the states the hook exposes. Screens,
when tested, render with the same providers and assert what is drawn
for each state, not how the service was called.

Fixture bodies are copied from the backend's `docs/api/` examples or
captured from a dev run with any signed parameter removed. A fixture
never contains a token, a real user id or the external provider's name.

## TDD workflow

Red, green, refactor:

1. Write the test. It fails.
2. Write the minimum code to make it pass.
3. Refactor with the tests green.

Tests and implementation ship in the same branch and the same PR.
A service without tests is not done, and neither is its screen.

## SEE

- vitest: https://vitest.dev/
- jest-expo: https://docs.expo.dev/develop/unit-testing/
- Testing Library for React Native: https://callstack.github.io/react-native-testing-library/
- TanStack Query testing: https://tanstack.com/query/latest/docs/framework/react/guides/testing
