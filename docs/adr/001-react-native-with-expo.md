# 001. React Native with Expo; desktop after V2

Why the rewrite stays on React Native with Expo instead of moving to
Swift and Kotlin, and why a desktop app is not designed now.

## Context

The legacy app is React Native with Expo, four SDKs behind, on the old
bridge, with an audio library that has no free upgrade path. The audit
that precedes this repo weighed going native against staying. Two
things changed since the legacy app was written: the heavy logic (the
external provider, search, catalog, the queue's data) moved to the
backend, so the client is thin; and the work is done by one person
with coding agents, where one language and one codebase count more
than raw native performance.

The audit also proposed a desktop app on Electron over
`react-native-web`. That target was never proven: the legacy repo had
`react-native-web` installed and not a single web file.

## Decision

The mobile app is React Native with Expo. Desktop is not decided and
not designed now. It gets its own record after V2 ships, with the
mobile app as evidence of what `core` and `ui` can carry.

Nothing is built "for desktop" ahead of time. What keeps the option
open is `002`: `core` has no platform dependency, so a second app
would add adapters, not rewrite services.

## Consequences

Why the alternatives were rejected:

- Native Swift and Kotlin: two codebases, no shared UI, and the parts
  that were once worth writing natively (stream resolution, the queue)
  now live in the backend or in `core`. The cost of two apps buys
  nothing the thin client needs.
- Flutter or another cross-platform stack: a third language for the
  team, no reuse of what the legacy app learned, and no gain over
  React Native for an app that draws API responses.
- Designing desktop adapters now: speculative work on a target with no
  user. The port interfaces in `core` are written for the mobile
  adapters; if desktop reveals a missing capability, the port changes
  then, with a record.

What is accepted: performance depends on the React Compiler, the New
Architecture and a disciplined `core`, not on native code. The audit's
metrics table (cold start, tap to audio, bundle size) is measured
against the legacy baseline once the shell exists; if the numbers do
not move, this record is revisited before V2, not after.
