# 002. pnpm monorepo with a platform-free core

Why the repo is three pnpm workspaces, why `packages/core` imports
nothing from React, React Native or Expo, and why adapters live in the
app and not next to the ports.

## Context

In the legacy app, nine of fourteen services imported the Supabase
client, which dragged in async storage and React Native polyfills, and
the config module read `process.env.EXPO_PUBLIC_*`, which Babel
inlines at build time and does not exist in Node. The day the music
service gained an import of `expo-sqlite`, all three test suites
stopped running, and nobody noticed because no workflow ran them. The
`@/*` alias let any file import any other, and there was at least one
import cycle.

## Decision

Three workspaces, one dependency direction:

    apps/mobile -> packages/ui -> packages/core

`packages/core` is TypeScript only. It never imports `react`,
`react-native`, `expo-*`, `@supabase/*`, TanStack Query or another
workspace. Everything it needs from outside is a port: an interface in
`packages/core/src/ports/` written in `core`'s vocabulary. Each port
has one adapter in `apps/mobile/src/adapters/`, the only file that
imports the library, and one in-memory fake for tests.

`packages/ui` holds tokens and components, depends on `core` for types
only, and never fetches.

Wiring is a factory, not a container: `createCore({ http, auth,
player, config, log, storage })` returns the services, and the app
calls it once at start. Workspaces are imported by package name;
`exports` in each `package.json` points at `src/index.ts` so no build
step is needed for typecheck or tests.

## Consequences

- `core` is tested with vitest in Node, without a simulator. That is
  the mechanical check of the rule: if `core` gains a platform import,
  its tests break at import time, as the legacy ones did.
- The boundaries are ESLint rules (`010`), not conventions.
- A new library means a port, an adapter and a fake in the same PR. It
  costs more than an import; that is the point.

Why the alternatives were rejected:

- One package with folders and a boundaries convention: that is the
  legacy layout, and discipline did not hold.
- Separate repositories per package: version drift between `core` and
  the app for a team of one, with no consumer of `core` outside the app
  yet.
- A dependency-injection container: the wiring is one call with six
  arguments; a container adds a runtime and a mental model for nothing.
- Ports as a fourth package: they are interfaces `core` owns and
  services depend on; moving them out only adds an import hop.
