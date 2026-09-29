# Architecture

How this repo is split, which way dependencies point, and where a
piece of code goes. Read this before touching code; the rules here are
enforced by ESLint (`eslint.config.js`), not by habit.

## The three packages

    packages/core     domain, services, ports        TypeScript only, runs in Node
    packages/ui       tokens and components          React Native, receives data and callbacks
    apps/mobile       Expo app                       routes, screens, query hooks, adapters

- **`@beatly/core`** knows the API contract and nothing about the
  platform. It never imports `react`, `react-native`, `expo-*`,
  `@supabase/*`, TanStack Query or the other two workspaces. Everything
  it needs from the outside world it asks for through a port. It is
  tested with vitest in Node, without a simulator, and that is the
  property that keeps it honest: the moment it needs a native module,
  its tests stop running.
- **`@beatly/ui`** is the design system: tokens and components. A
  component receives data and callbacks as props and draws them with
  tokens. It never fetches, never reads a query, never imports the app,
  and never translates: text arrives already translated.

  `apps/mobile/app.config.ts` imports `@beatly/ui`'s main entry
  (`packages/ui/src/index.ts`) and is evaluated under Node by Expo's
  config loader, which cannot parse `react-native`'s source. So nothing
  reachable from that main entry may import `react-native`, directly or
  transitively. A token or component that needs `react-native` (for
  example `StyleSheet.hairlineWidth`) lives behind the separate
  `@beatly/ui/native` entry (`packages/ui/src/native.ts`) instead, which
  `app.config.ts` never imports.

- **`@beatly/mobile`** is the only place that knows it is a phone. It
  holds the expo-router routes, the screens, the TanStack Query hooks
  over `core` services, the i18n namespaces, and one adapter per
  external library. It wires the adapters into `core` once, at start,
  with `createCore()`.

## Dependency direction

    apps/mobile ──> packages/ui ──> packages/core
         └──────────────────────────────┘

Arrows mean "depends on". `core` depends on nothing in the repo. `ui`
depends on `core` for types only. `apps/mobile` depends on both. A
workspace is imported by its package name (`@beatly/core`,
`@beatly/ui`), never by a relative path into another workspace's `src`.
Inside a workspace, a relative import carries the file's real
extension (`./tokens/color.ts`, `./TrackRow.tsx`): `app.config.ts` is
evaluated by Node's type-stripping loader, which resolves nothing
else, and `allowImportingTsExtensions` in `tsconfig.base.json` lets
tsc accept it. ESLint rejects the extensionless and `.js` forms, except
inside a dynamic `import()` / `require()` or a dotted extensionless name
like `./Foo.test`, which it does not catch.

## Ports

A port is an interface in `packages/core/src/ports/`. It describes what
`core` needs, in `core`'s vocabulary, with no library type in it. Each
port has exactly one adapter in `apps/mobile/src/adapters/`, which is
the only file allowed to import the library behind it, and one
in-memory fake in `packages/core/test/fakes/`.

| Port      | What core needs                                                        | Adapter               | Library behind it                             | Fake for tests                           |
| --------- | ---------------------------------------------------------------------- | --------------------- | --------------------------------------------- | ---------------------------------------- |
| `http`    | send a request, get status, headers and raw body back                  | `adapters/http.ts`    | the platform `fetch`                          | handlers per route; unknown route throws |
| `auth`    | the access token, sign in / up / out, confirmEmail, getStatus, events  | `adapters/auth.ts`    | `@supabase/supabase-js` + `expo-secure-store` | a fixed token                            |
| `player`  | load a URL, play, pause, seek, queue the next one, playback events     | `adapters/player.ts`  | `expo-audio`                                  | in-memory player with a manual clock     |
| `log`     | `debug`, `info`, `warn`, `error` with structured fields                | `adapters/log.ts`     | `console`, the only file allowed to           | an array                                 |
| `storage` | get / set / delete small key-value data (recent searches, preferences) | `adapters/storage.ts` | async storage                                 | a `Map`                                  |

There is no `config` port for now: the three public build-time values (API
base URL, auth URL and anon key) are read in `apps/mobile/src/env.ts`, which
`createCore()` passes to the adapters that need them. A `config` row is added
if `core` ever needs a value that is not one of those.

`adapters/i18n.ts` wraps `i18next` and `expo-localization`. It has no
port because `core` never translates.

The list grows by one row per adapter, in the same PR as the adapter,
and the library's name is added to the adapter-only list in
`eslint.config.js` in that same PR. The exception is a library that draws UI:
it has a single importer in `packages/ui` (`Icon.tsx`, `GlassSurface.tsx`,
`GradientFill.tsx`),
enforced the same way in `eslint.config.js`; see ADR 017.

## How a screen gets data

    screen  ->  query hook  ->  core service  ->  HTTP client  ->  http port  ->  adapter  ->  API
    (draws)     (cache)         (use case)        (envelope,        (raw           (fetch)
                                                   zod, timeout)     request)

- The **HTTP client** (`packages/core/src/http/`) is the only place
  that builds a URL, sets the `Authorization` header, applies a
  timeout, reads `ok`/`reason`, validates the body with zod and turns
  the response into one of three outcomes: success with typed data,
  API failure with its `reason`, transport failure. It also exposes
  the `Cache-Control` max-age of the response.
- A **service** (`packages/core/src/services/`) is a use case over the
  client and the other ports: `listPlaylists`, `likeTrack`,
  `playFromQueue`. It returns outcomes; it never throws for an
  expected `reason`.
- A **query hook** (`apps/mobile/src/queries/`) wraps a service in
  TanStack Query. Its `staleTime` comes from the response's
  `Cache-Control`, never from a literal. Mutations invalidate the
  user-data queries the contract says they affect.
  A mutation over a service that has only success and failure
  outcomes throws `OutcomeError` from `mutationFn` when the outcome is
  not `ok`, so the caller reads `isError` (`useCreatePlaylist`). A
  mutation over a port with more results than success and failure
  returns the outcome as data (the auth mutations, where
  `confirmation_sent` is neither).
- A **screen** reads the hook, maps each state (loading, data,
  expected empty, error) to `ui` components, and calls mutations. If a
  screen needs to compute something across pages, rank, aggregate or
  re-sort, that is not drawing: it is a backend issue.

Growable lists go through the shared paginated helper in `core` and the
shared infinite-query hook in `apps/mobile`. A 422 `invalid_cursor`
drops the cursor and refetches the first page.

## Boundaries, and why each exists

Enforced in `eslint.config.js`. Each one comes from a bug the legacy app
actually had.

| Rule                                                                  | Why                                                                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `core` never imports react, react-native, expo, supabase, TanStack    | The legacy suite stopped running (0 tests) the day a service imported a native module. Node-only `core` cannot regress that way. |
| `ui` never imports the app, a data library or an adapter-only library | A component that fetches cannot be rendered in isolation or reused on another surface.                                           |
| An adapter-only library is imported by its adapter only               | Two initializations of the audio engine and 14 globals as a state bus came from importing the library from anywhere.             |
| The global `fetch` appears in one file                                | Six copies of `authFetch`, none reading `{ok, reason}`, each with its own redirect policy.                                       |
| Workspaces are imported by package name                               | A relative path into another workspace's `src` bypasses `exports` and the rules above.                                           |
| No `console.*` outside the log adapter                                | 93 direct calls with no way to silence or ship them.                                                                             |
| No `any`, explicit or cast                                            | 311 in the legacy, all from untyped responses. A schema at the edge makes them unnecessary.                                      |
| No `useMemo` / `useCallback` / `memo` without a justifying comment    | The React Compiler memoizes. A manual one hides a data-flow problem; a justified one documents the compiler's limit.             |

The last rule accepts an `eslint-disable-next-line no-restricted-syntax`
followed by `--` and the reason the compiler is not enough. The
description is mandatory; a disable without one fails lint.

Two rules are not expressible in ESLint and are checked in review:
every visual value comes from `packages/ui` tokens, and every visible
string comes from i18n in both languages. A parity test keeps `es` and
`en` in step.

## Where does this go?

| I need to...                             | It goes in                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| call a new API route                     | a service in `core`, a schema in `core/domain`                                                       |
| talk to a new native module or library   | a port in `core`, an adapter in `apps/mobile` (a UI-drawing one: a single importer in `packages/ui`) |
| show data on a screen                    | a query hook, then the screen                                                                        |
| add a visual value (color, size, radius) | `packages/ui/src/tokens/`, with a named role                                                         |
| add a reusable piece of UI               | `packages/ui/src/components/`                                                                        |
| add text                                 | `apps/mobile/src/i18n/es/` and `en/`, same PR                                                        |
| decide something non-obvious             | `docs/adr/`                                                                                          |
| document what a screen uses and draws    | `docs/features/`                                                                                     |
| compute across pages, rank, aggregate    | a backend issue                                                                                      |

## See also

    CLAUDE.md          hard rules, definition of done, review severities
    docs/adr/          the decisions behind this layout, one record each
    docs/features/     one file per screen: routes it uses, states it draws
    docs/testing.md    runners, fakes, what each test asserts
