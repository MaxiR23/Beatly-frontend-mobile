# 029. Images through expo-image behind a single UI importer

## Context

React Native's `Image` redownloads and redraws covers on every reopen of an album, a playlist or the
player: there is no memory cache control, so back and reopen shows the same covers loading again. The
measured numbers, before and after, are in the pull request of issue 132.

## Decision

`expo-image` at the SDK 58 pin becomes a direct dependency of `apps/mobile` (installed with
`npx expo install`) and a peer and dev dependency of `packages/ui`. It has a single importer,
`packages/ui/src/components/Picture.tsx`, enforced in `eslint.config.js` following ADR 017, and React
Native's `Image` and `ImageBackground` are banned everywhere, so every image goes through `Picture`.

`Picture` fixes four behaviours in one place:

- `cachePolicy="memory-disk"`.
- No transition on iOS, which draws as it did before the migration. On Android the transition is
  `{ duration: motion.duration.imageFade (300), skipOnCacheHit: "all" }`: a network load fades, a memory
  or disk hit draws at once. This keeps Android's former network-load fade and drops its disk-load fade; it
  is the owner's decision after a device check. A source change on Android always plays the transition, so
  a re-pointed cover (the player on a skip) blanks through the recycling key and fades in. The fade stays
  under reduce motion: the repo keeps fades and removes movement and scale there (DESIGN.md).
- A remote source's URL as its `recyclingKey`, so a reused or re-pointed view never shows the previous
  picture, as React Native's `Image` did by blanking it. The key is derived from the URL inside `Picture`,
  not threaded through every caller.
- `priority`: `normal` by default; `high` on the main cover of a screen (the detail cover and image
  heroes, the player cover), so it is not queued behind the rows' and cards' covers.

`prefetchPicture` (the same importer) fetches a cover into the memory and disk cache at the tier its drawn
side needs. The player uses it on every track change for the next queued track's cover at the player's
size; a failure is logged.

Rejected: prefetching the whole queue or the lists' covers (bandwidth for pictures that may never draw;
out of the issue); keeping React Native's `Image` plus prefetch (no memory cache control, out of scope); no
transition on Android too (it loses its network-load fade); the same transition on iOS (measured on the
device, the owner chose iOS with none); a session set of loaded URLs (module state in a `ui`
component, wrong after a relaunch); `skipOnCacheHit: "memory"` (disk hits, every cover after a relaunch,
would fade, against the goal); a recycling key threaded from item ids (every caller changes for the same
identity the URL already is); an adapter in `apps/mobile` (a library that draws UI lives in
`packages/ui`, ADR 017).

## Consequences

- `accessibilityIgnoresInvertColors` is not honoured natively by `expo-image`; with iOS Smart Invert the
  brand icon may invert.
- The dominant color still downloads the `small` tier separately, outside this cache.
- It works in Expo Go.
- The Android fade is a native animation: it is verified on the phone only.
- Image bytes that `expo-image` loads or prefetches are not API calls: they stay outside the "No HTTP call outside `core`" rule.
