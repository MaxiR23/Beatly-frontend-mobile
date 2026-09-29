# 019. Dominant color behind an adapter

How a detail screen gets the color it tints its hero wash and top bar with.

## Context

The detail base draws a wash behind the hero cover and tints its top bar with the
dominant color of the cover. The color has to be read from the image on the
device. `react-native-image-colors` does it, but it is a native module: its entry
evaluates `requireNativeModule('ImageColors')` on import, so a static import
crashes in Expo Go, where the module is not built in.

## Decision

- The library sits behind `apps/mobile/src/adapters/imageColors.ts`, its only
  importer, listed in the adapter-only libraries of `eslint.config.js`.
- The adapter has no port in `core`: `core` never needs a color, the same
  reasoning as the i18n adapter.
- The adapter checks `requireOptionalNativeModule("ImageColors")` first and only
  then loads the library, with a lazy `require` so nothing is evaluated where the
  module is missing.
- It keeps a per-url promise for the session, so a url is analysed once. The
  library's own cache is off.
- It returns a typed outcome (`color`, `unavailable`, `failed`), never a swallowed
  empty. A failure is removed from the cache so a later mount retries, and the
  hook logs it through the `log` port.
- Where the color is not available the surfaces stay neutral
  (`color.surface.base`).
- Rejected: a port in `core` (nothing in `core` uses it); computing the color in
  the backend (a new field on every image route for a purely visual value); a
  static import (crashes in Expo Go).

## Consequences

- Expo Go shows neutral surfaces; the native path is checked by hand on a
  development build.
- A screen that wants a color reads the `useDominantColor` hook of
  `screens/detail/`.
