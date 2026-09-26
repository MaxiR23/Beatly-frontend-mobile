# 004. expo-audio behind the player port; RNTP v5 as plan B

Why the audio engine is `expo-audio`, why it sits behind a `player`
port that no library type crosses, and why `react-native-track-player`
v5 is the fallback and not the choice.

## Context

The legacy app plays through `react-native-track-player` v4, which does
not support the New Architecture the current SDK requires. Version 5 is
a rewrite, not backwards compatible, and under a commercial license
with a free tier for personal use. The legacy build also patched a
Swift dependency inside `ios/Pods` from CI to fix a doubled duration on
fragmented MP4 streams; that patch dies with v4.

`expo-audio` is first-party, ships with the SDK, and covers background
playback, lock screen controls, preloading and playlists. It has not
been proven on Beatly's streams yet.

The audio engine is the one dependency that cannot be swapped by
editing an import, which is exactly why it must be swappable by
editing one file.

## Decision

- `expo-audio` is the engine.
- It is reached only through the `player` port in `core`: load a URL,
  play, pause, seek, queue the next item, and a stream of playback
  events (position, ended, error). The port speaks `core`'s types; no
  `expo-audio` type is exported by the adapter.
- `apps/mobile/src/adapters/player.ts` is the only file that imports
  `expo-audio`. The ESLint adapter-only list enforces it.
- The queue, autoplay, shuffle and the "30 seconds played" rule live
  in `core`, over the port, and are tested with an in-memory player
  and a manual clock.
- Plan B is `react-native-track-player` v5, if `expo-audio` fails on a
  real device at any of: background playback, lock screen controls from
  the first play, next and previous from the lock screen with the app
  in background, preloading the next track, correct duration on
  fragmented MP4. Switching means writing a second adapter and reading
  the v5 license against Beatly's actual use before merging it.

## Consequences

- The five device checks above are the manual QA of the first player
  PR, listed in its `Still to check by hand` and closed on a device
  before the vertical is called done.
- The stream URL the port receives comes from the backend, like every
  other piece of data. The client does not resolve audio.
- No patch to native dependencies in CI. If a duration bug reappears
  with `expo-audio`, it is an upstream issue, not a build step.

Why the alternatives were rejected:

- `react-native-track-player` v4 on the interop layer: no future, and
  it keeps the Pods patch alive.
- `react-native-track-player` v5 as plan A: a commercial license for a
  first-party alternative that has not been shown to fall short. The
  license reading is deferred until it is needed.
- Writing the port around `expo-audio`'s own API: it would make plan B
  a rewrite of `core` instead of a second adapter.
