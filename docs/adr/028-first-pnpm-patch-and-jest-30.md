# 028. First pnpm patch and jest 30

Two dependency decisions that came with the move to Expo SDK 58 and React
Native 0.88.

## Context

React Native 0.88 removed the `NativeMethods` type. `@react-native-masked-view/masked-view`
0.3.2 still declares `Constructor<ReactNative.NativeMethods>` in its
`types/index.d.ts`, so `AlphaMask` (ADR 026) failed typecheck. The repo does
not allow an opt-out of strict types. Separately, `expo install --check` for
SDK 58 asks for jest 30 (`jest-expo` 58 accepts `^29 || ^30`).

## Decision

- The masked view's `.d.ts` is patched with `pnpm patch`, through
  `patchedDependencies` in `pnpm-workspace.yaml`
  (`patches/@react-native-masked-view__masked-view@0.3.2.patch`). The patch is
  one line: `NativeMethods` becomes `HostInstance`. It is the first patch in
  the repo. `AlphaMask.tsx` does not change.
- Remove the patch when the package types against React Native 0.88. pnpm
  stops the install if the patch no longer applies, so a new version of the
  package surfaces the question instead of hiding it.
- `jest` and `@jest/globals` move from 29.7.0 to 30.5.2 in `apps/mobile` and
  `packages/ui`, because `expo install --check` requests it. `@parcel/watcher`,
  which jest-haste-map 30 pulls, gets `allowBuilds: false`: it falls back to a
  crawler without the native build.

## Consequences

- A dependency's install now differs from the registry's by one patch file,
  which has to be reviewed on every upgrade of that package.
- Tests run on jest 30.
