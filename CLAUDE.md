# CLAUDE.md

Guidance for coding agents working in this repository.

## Project

Beatly mobile — the React Native app for Beatly, a music streaming
service. It draws what the Beatly API returns. The API lives in the
backend repo, checked out next to this one at `../beatly-backend`.

Status: rewrite of a previous, unmaintained app. Screens are ported one
at a time, each rewritten against the backend's response contract. The
legacy audit that drives the port lives in the old repo under
`docs/next-step/`; the decisions below win wherever they disagree.

## Stack

- pnpm monorepo with three workspaces:
  - `packages/core`: domain, services and ports. TypeScript only. It
    never imports `react`, `react-native` or `expo-*`, and it is tested
    in Node without a simulator.
  - `packages/ui`: design tokens and components. Receives data and
    callbacks; never fetches.
  - `apps/mobile`: Expo, latest stable SDK, React Compiler on. Holds the
    routes, the screens, the query hooks and every adapter.
- One HTTP client, in `core`. It reads `ok`/`reason` from the body,
  validates every response with zod at the edge, and has a timeout. The
  global `fetch` lives in the `http` adapter and nowhere else.
- TanStack Query for data in the UI. Cache times come from the
  backend's `Cache-Control` header, exposed by the HTTP client. They
  are never hardcoded in a hook.
- Audio: `expo-audio` behind the `player` port. Only its adapter
  imports it.
- Supabase for auth only, behind the `auth` port. Every other byte
  goes through the backend API.
- i18n in `es` and `en` from the first screen. Single dark theme,
  defined once in `packages/ui` tokens.
- Tests: vitest in `core`; jest-expo only where React Native is
  actually needed.
- Hooks with lefthook. Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Commands

    pnpm install                 also installs the git hooks (lefthook)

    pnpm dev                     Expo dev server for apps/mobile
    pnpm typecheck               tsc across all workspaces
    pnpm lint                    eslint (with import boundaries) + prettier --check
    pnpm test                    vitest in core, jest-expo in mobile
    pnpm --filter @beatly/core test -- <pattern>
    pnpm format                  to fix formatting

The local gate is `pnpm typecheck`, `pnpm lint`, `pnpm test`. Hooks:
pre-commit runs eslint and prettier on the staged files, commit-msg
runs commitlint, pre-push runs typecheck and test. CI runs all three
and is not skippable.

## API contract

The contract is owned by the backend and defined in
`../beatly-backend/docs/api/conventions.md`, with one file per domain
next to it. Read the domain's file before touching a screen that uses
it. Never guess a route, a field or a `reason`.

Every response is one of two shapes:

    {"ok": true,  "data": ...}
    {"ok": false, "reason": "snake_case"}

Growable lists come as `{"items": [...], "page": {...}}` inside `data`,
with an opaque cursor.

How the client consumes it:

- Branch on `ok` in the body, not on the HTTP status. `reason` is a
  stable identifier for branching and maps to an i18n key. It is never
  shown raw.
- The HTTP client turns each response into one of three outcomes:
  success with schema-validated data, API failure with its `reason`,
  or transport failure (timeout, network, body that fails the schema).
  Services return those outcomes; they never throw for an expected
  `reason`.
- An expected empty state is a value, not an error: `items: []`,
  `lyrics: null`, three empty lists, `artist: null`. The screen draws
  its empty state. Never turn it into a retry.
- Any list that can grow uses the shared paginated helper in `core`
  and the shared infinite-query hook in `apps/mobile`. A 422
  `invalid_cursor` discards the cursor and refetches the first page.

## Layering

Dependencies point one way: `apps/mobile` depends on `ui` and `core`;
`ui` depends on `core`; `core` depends on nothing in the repo. ESLint
enforces the boundaries; nobody relies on discipline.

Ports are interfaces in `packages/core/src/ports/`: `http`, `auth`,
`player`, `config`, `log`, `storage`. Each one has exactly one adapter
in `apps/mobile/src/adapters/` and an in-memory fake for tests. A
service receives its ports; it never imports a library. `createCore()`
wires the adapters once, at app start.

Screens draw. They read a query hook, map data to `ui` components and
call a mutation. Business logic that cannot be expressed as "map this
response to these components" belongs to the backend, and a screen
that needs it opens a backend issue instead of computing it here.

## Hard rules

- The backend does the heavy logic; the front only draws. No ranking,
  aggregating, deduplicating or re-sorting large sets on the client.
- No colors, sizes, spacing, radii or font values outside
  `packages/ui` tokens. Not in a `StyleSheet`, not inline, not in a
  gradient.
- No visible text outside i18n. Every string ships in `es` and `en`
  in the same change.
- No HTTP call outside the `core` client. The global `fetch` appears in
  exactly one file, `apps/mobile/src/adapters/http.ts`, behind the
  `http` port. Screens and hooks never build a URL.
- No external library imported outside its adapter. `expo-audio`,
  `@supabase/*`, storage, file system: each one lives in one file
  under `apps/mobile/src/adapters/`.
- Never name the external provider, in code, comments, docs, tests or
  commits. It is "the external provider".
- Zero secrets in the code. The only env values are the API base URL
  and the Supabase URL and anon key, which are public by design.
  Anything else has no place in a client bundle.
- No direct `console.*`. Use the `log` port. No `any`, explicit or via
  a cast; a response without a type gets a zod schema.
- No `catch` that swallows an error and returns an empty value or a
  success. A failure reaches the screen as a typed outcome.
- A `reason` or an error message is never shown to the user as text.
  It maps to an i18n key, or to the generic error state.
- No `useMemo`, `useCallback` or `memo` unless the line above carries
  an `eslint-disable-next-line no-restricted-syntax -- <why>` saying
  why the React Compiler is not enough for that case. The compiler
  memoizes; a manual one without that comment hides a data-flow
  problem and is Blocking in review.

## Layout

    apps/mobile/
      app/                  expo-router routes, thin files that render a screen
      src/screens/          one folder per screen
      src/queries/          TanStack Query hooks over core services
      src/adapters/         one file per external library: http, auth, player, config, log, storage
      src/i18n/es/ en/      one namespace per screen, key parity enforced by a test
      src/providers/        thin React providers over core
      test/                 mirrors src/
    packages/core/
      src/ports/            the six interfaces
      src/http/             the single HTTP client and the paginated helper
      src/domain/           zod schemas and the types inferred from them
      src/services/         use cases, one file per API domain
      test/                 mirrors src/; fakes under test/fakes/
    packages/ui/
      src/tokens/           color, spacing, radius, typography, motion
      src/components/
      test/                 mirrors src/
    docs/                   workflow, testing, repository setup
    docs/adr/               architecture decision records
    docs/features/          one file per screen: endpoints it uses, states it draws

## Definition of done

A screen is done when it has all five:

1. Data through `core`: a service with its schema, a query hook whose
   cache time comes from `Cache-Control`.
2. Every state drawn: loading, with data, expected empty, error with
   retry. Each `reason` the screen branches on is mapped to i18n.
3. Strings in `es` and `en`; every visual value a token.
4. Tests for the service's four cases: with data, expected empty,
   `ok: false` with the reason the screen needs, and transport failure.
   Component tests only for components with their own logic.
5. Its entry in `docs/features/`.

Tests and implementation ship in the same branch and the same PR.

## Workflow

Work goes through the agent loop in `.claude/agents/`:

    refine-issue -> plan-issue -> (human approval) -> implement-issue
    -> review-changes -> verify-findings -> implement-issue (fix mode)
    -> ship-issue (prepare) -> (human approval) -> ship-issue (publish)

Docs-only changes can take a short path instead of the full loop. It
applies only when all three conditions hold:

1. The change touches only `.md` files or configuration that does not
   affect the build.
2. It does not touch `CLAUDE.md` or `.claude/agents/`.
3. It does not touch code, dependencies, CI or tokens.

The short path is:

    implement-issue -> gate -> ship-issue

The gate is `pnpm typecheck && pnpm lint && pnpm test`. The short path
skips `refine-issue`, `plan-issue`, `review-changes` and
`verify-findings`. `implement-issue` works from the issue itself: its
scope and acceptance criteria stand in for the plan. `ship-issue` still
prepares the draft and publishes only after the owner approves it.

A change that fails any of the three conditions goes through the full
loop; there is no partial path. When in doubt, the full loop runs.

Issues live in GitHub, read with `gh issue view`. Only `implement-issue`
writes application code; the other five never touch it and write only to
`.claude/loop/`, which is not versioned.

Only `ship-issue` creates branches, commits, pushes and opens or updates
pull requests, and only when the repo owner invokes it. It prepares the
branch, the commit and the pull request draft, then stops: publishing
requires the owner's approval of the draft. Blocking and important
findings are fixed before a pull request is opened; minor ones are the
owner's call. Minor review findings get at most one fix cycle; any
minor still open after that is listed in the pull request for the owner
to decide. No other agent touches git history or GitHub.

Branches: `w_<YYMMDD>_<type>_<desc>`. Run `date` before naming one.
Commits: conventional commits, single line, no body. The reasoning,
rejected alternatives and risks go in the pull request description.
Pull requests target `main` and close their issue with `Closes #N`.

Decisions and merge: the repo owner.

## Review

These are the repo's hard failures. `review-changes` applies them in the
full loop, and `ship-issue` greps for the secret and provider ones on
the short path; they are listed here because they are project rules,
not agent configuration.

Blocking:

- An HTTP call outside the `core` client, or the global `fetch` outside
  its adapter.
- An external library imported outside its adapter.
- A `useMemo`, `useCallback` or `memo` without the comment that says
  why the React Compiler is not enough.
- A color, size, spacing, radius or font value outside tokens.
- Visible text outside i18n, or a string added in one language only.
- A secret, or the external provider's name, in code, docs or commits.
- A `reason` or error message shown raw to the user.
- A `catch` that swallows an error and returns an empty value or a
  success.
- An expected empty state treated as an error.
- Logic that belongs to the backend computed on the client.
- A `core` file importing `react`, `react-native`, `expo-*` or a
  library directly.

Important:

- `console.*` outside the `log` adapter.
- `any`, explicit or via a cast.
- A cache time hardcoded in a hook instead of read from `Cache-Control`.
- A screen shipped without one of its four states, or a service without
  its expected-empty or transport-failure test.
- A growable list not using the shared paginated helper and hook.
- A screen touched without its `docs/features/` entry updated.

Formatting and lint are not flagged. The gate covers those.

## See also

    ARCHITECTURE.md                             packages, ports, boundaries and why
    ../beatly-backend/docs/api/conventions.md   response contract, status codes, reasons
    ../beatly-backend/docs/api/                 per-domain API documentation
    docs/features/                              per-screen documentation
    docs/testing.md                             test conventions and file headers
    docs/workflow.md                            issue to pull request, step by step
    docs/repository-setup.md                    GitHub and local configuration
    docs/adr/                                   architecture decision records
