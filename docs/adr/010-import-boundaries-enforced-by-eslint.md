# 010. Import boundaries enforced by ESLint

Why the package boundaries of `002` are lint rules in the gate, and why
they are written with ESLint's own `no-restricted-*` rules instead of a
boundaries plugin.

## Context

The legacy app's `@/*` alias resolved to the repo root, so any file
could import any other, and at least one cycle existed. The boundary
"services do not import the platform" was a convention, and it broke
the day a service imported a native module. A boundary that is not
checked by a tool holds until the first deadline.

## Decision

The boundaries are rules in `eslint.config.js`, run by `pnpm lint` in
the pre-commit hook and in CI:

- `packages/core` cannot import `react`, `react-native`, `expo-*`,
  `@supabase/*`, TanStack Query or another workspace.
- `packages/ui` cannot import the app, a data library or an
  adapter-only library.
- An adapter-only library (`expo-audio`, `@supabase/*`,
  `expo-secure-store`, storage, file system, and every one added later)
  can be imported only from `apps/mobile/src/adapters/`.
- A workspace is imported by its package name; a relative path into
  another workspace's `src` is an error.
- The global `fetch` is allowed in `apps/mobile/src/adapters/http.ts`
  only. `console` is allowed in `apps/mobile/src/adapters/log.ts` only.
- `any`, explicit or through a cast, is an error.
- `useMemo`, `useCallback` and `memo` are errors unless the line above
  carries an `eslint-disable-next-line` with a description; a disable
  without a description is itself an error.

A test in `core` proves, at test time, that `core` imports nothing
from the platform, so a change to the lint config cannot hide a
regression.

The rules are written with `no-restricted-imports`,
`no-restricted-globals` and `no-restricted-syntax`, with per-directory
overrides. Adding an adapter means adding one string to one list in
the same PR.

## Consequences

- A boundary violation fails the gate locally before it reaches a PR.
- Two rules are not expressible this way and stay in review: visual
  values outside tokens and strings outside i18n.
- The adapter-only list is a maintained artifact: an adapter PR that
  forgets the list is an Important review finding.

Why the alternatives were rejected:

- A boundaries plugin or a dependency-cruiser config: another
  dependency and a second rule language for constraints that ESLint's
  own rules express in a screen of config. Revisited if the rules
  outgrow `no-restricted-imports` (for example, per-layer rules inside
  `core`).
- TypeScript project references as the boundary: they constrain
  compilation, not imports of a library that happens to be installed,
  which is the case that broke the legacy tests.
- Convention plus code review: it is what the legacy repo had.
