# 030. Cover color from the backend

Supersedes `019-dominant-color-behind-an-adapter.md`.

## Context

ADR 019 extracted the color of a cover on the device with a native module. That module is absent in
Expo Go, so Expo Go drew neutral surfaces. The backend now sends `image.color` (conventions.md,
"Color"): a lowercase `#rrggbb` or `null`, already adjusted to work as a tint over the dark theme
under white text. It is never an error and has no `reason`.

## Decision

- `color` is optional and nullable in `imageTiersSchema`, validated as lowercase `#rrggbb`. Every
  schema that carries an `image` or a `mosaic` reuses that one schema, so every response exposes it.
  A color that breaks the format fails the response like any field that breaks the contract.
- The album, playlist, player and mini player backgrounds read it. `null` or absent gives the neutral
  surface.
- `ColorFade` (in `packages/ui`) fades a color in over `motion.duration.base` on the native driver
  when it goes from null to a value after mount, with no animation at mount, between two colors or
  under reduce motion.
- A pending color is refreshed only by the `Cache-Control` the client already follows. No polling and
  no extra refetch.
- The library, its adapter and `useDominantColor` are removed.
- Rejected:
  - Keeping on-device extraction as a fallback: two sources for one value, and the native module
    again.
  - Adjusting the color on the client: the backend already does it.
  - Polling or a refetch for a pending color.
  - Interpolating the color string in JS: a re-render per frame, and `GradientFill` stops and the
    native glass tint cannot take an animated value.

## Consequences

- Expo Go shows colors.
- The player and mini player keep the color the queue was built with: they read the playback
  snapshot, not a response, so a later refetch of the album does not reach the queue.
- The pending-color cap on `max-age` applies to the `max-age=<N>` responses only (the album).
  Playlists are `private, no-cache` and `no-store`, so they pick up a pending color on their next
  refetch.
- The iOS 26+ mini player stays bare, with no color.
