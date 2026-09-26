# 003. Expo SDK version policy

Why the app always targets the latest stable Expo SDK, at most one
behind, upgraded in a pull request of its own, with the React Compiler
on.

## Context

The legacy app was four SDKs behind when the rewrite was decided, on
the old bridge that the current SDK no longer ships. Peer dependency
conflicts were masked with `--legacy-peer-deps` on Android and
`--force` on iOS, so the two build workflows did not even install the
same tree. Each SDK skipped made the next upgrade larger, until it
became a rewrite.

## Decision

- `apps/mobile` targets the latest stable Expo SDK. When a new one
  ships, the app is at most one behind until its upgrade lands.
- An SDK upgrade is a pull request of its own, titled
  `chore(mobile): upgrade to sdk NN`, with no feature in it. It runs
  `npx expo install --fix` and `npx expo-doctor`, and is verified on a
  device before merge.
- The React Compiler is on from the first screen. No manual
  memoization for performance; a justified exception needs a comment
  (`CLAUDE.md`, Hard rules).
- Beta and canary SDKs are never targeted.

## Consequences

- Roughly three upgrade PRs a year, each small because the previous one
  landed.
- Native code is generated, not versioned, wherever the SDK allows it,
  so an upgrade does not carry hand-edited `ios/` or `android/`
  directories; the record that fixes that convention comes with the
  first build.
- A library that does not support the current SDK is a blocker for the
  upgrade PR, and gets replaced or dropped in that PR, not worked
  around with an install flag.

Why the alternatives were rejected:

- Pinning and upgrading "when needed": that is how the legacy app
  ended four behind. The need never arrives on its own.
- Bundling the upgrade with a feature: an upgrade breaks things in
  ways a feature diff hides, and a revert takes the feature with it.
- Skipping the React Compiler until later: turning it on afterwards
  means auditing every manual memoization written in the meantime.
