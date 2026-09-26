# Beatly mobile

The React Native app for Beatly, a music streaming service. It draws
what the Beatly API returns; the API lives in the sibling
[`beatly-backend`](../beatly-backend) repo and does the heavy lifting.

## Status

Rewrite of a previous, unmaintained app. Phase 0: the workspace,
tooling, CI and decisions exist; no screen does yet. Screens are ported
one at a time against the backend's response contract.

## Stack

- pnpm monorepo: `packages/core` (domain, services, ports),
  `packages/ui` (tokens, components), `apps/mobile` (Expo, React
  Compiler)
- One HTTP client in `core`: reads `ok`/`reason`, validates with zod,
  has a timeout
- TanStack Query for data in the UI, cache times from the backend's
  `Cache-Control`
- `expo-audio` behind a `player` port; Supabase for auth only
- i18n in `es` and `en`; a single dark theme from design tokens
- vitest in `core`, jest-expo only where React Native is needed
- lefthook for hooks, commitlint for messages, ESLint for import
  boundaries

## Running

Requires Node 24 (`.nvmrc`) and pnpm (`packageManager` in
`package.json`).

    nvm use
    pnpm install               also installs the git hooks
    cp .env.example .env       three public values, no secrets

The Expo dev server arrives with `apps/mobile` in Phase 1. Until then
the repo runs its checks only.

## Checks

Run manually:

    pnpm typecheck
    pnpm lint                  eslint + prettier --check
    pnpm test
    pnpm format                to fix formatting

Run automatically:

| Where       | What runs                                        | Skippable |
| ----------- | ------------------------------------------------ | --------- |
| pre-commit  | eslint --fix, prettier --write on staged         | yes       |
| commit-msg  | commitlint                                       | yes       |
| pre-push    | typecheck, test                                  | yes       |
| CI (GitHub) | install --frozen-lockfile, typecheck, lint, test | no        |
| GitGuardian | secret scan, `GitGuardian Security Checks`       | no        |

The `main` branch ruleset requires two of these as status checks:
`checks` (the CI job) and `GitGuardian Security Checks`; see
[`docs/repository-setup.md`](docs/repository-setup.md).

## Layout

    apps/mobile/        Expo app: routes, screens, query hooks, adapters, i18n
    packages/core/      domain, services, ports, the HTTP client; tested in Node
    packages/ui/        design tokens and components
    docs/               workflow, testing, repository setup
    docs/adr/           architecture decision records
    docs/features/      one file per screen: routes it uses, states it draws
    .github/            CI and issue / pull request templates

## Rules

- The backend does the heavy logic; the front only draws.
- Every response is `{ok: true, data}` or `{ok: false, reason}`. The
  client branches on `ok`; `reason` maps to i18n and is never shown raw.
- No `fetch` outside the `core` client. No library outside its adapter.
- No color, size or spacing outside tokens. No visible text outside i18n.
- No secrets in the code. The external provider is never named.
- No `console.*`, no `any`.

The full list, with severities, is in [`CLAUDE.md`](CLAUDE.md).

## See also

- [`ARCHITECTURE.md`](ARCHITECTURE.md): packages, ports, boundaries and why
- [`docs/adr/`](docs/adr/): the decisions, one record each
- [`docs/workflow.md`](docs/workflow.md): issue to pull request
- [`docs/testing.md`](docs/testing.md): runners, fakes, coverage rules
- [`docs/repository-setup.md`](docs/repository-setup.md): GitHub and local configuration
