# 037. A pnpm patch to expo-audio for the lock screen's next and previous and its duration

## Context

Issue 170 adds background playback and the lock screen (iOS Control Center, Android media notification) with title, artists, album, artwork, the real duration and next and previous. expo-audio 58.0.10 wires next and previous only for `AudioPlaylist`; a single `AudioPlayer` reports no support for them. The upstream request is expo/expo#43538 (open, unmerged). The iOS engine also reports twice the real duration of the fragmented MP4 streams (measured in issue 166, handled in `core` by #167), and the published API offers no way to give the lock screen another one. This is patched rather than switching audio library (the plan B trigger of ADR 004) because the published API already covers most of the need and the patch is minimal and removable once #43538 ships.

## Decision

`patches/expo-audio@58.0.10.patch`, registered in `patchedDependencies` of `pnpm-workspace.yaml` (the second patch, after ADR 028), touches 9 files:

- `ios/AudioPlayer.swift` and `android/.../AudioPlayer.kt`: the player reports next and previous support and emits `onRemoteNextTrack` and `onRemotePreviousTrack` (event names from #43538).
- `ios/AudioRecords.swift` and `android/.../AudioRecords.kt`: `Metadata` gains an optional `duration`.
- `ios/MediaController.swift`: the now playing info uses `metadata.duration` before the engine's.
- `android/.../service/MetadataInjectingPlayer.kt`: the session player reports `metadata.duration` before the engine's.
- `android/.../service/AudioControlsService.kt`: the session player advertises seek to next and previous for a single-item engine and routes them to `nextTrack()` and `previousTrack()`.
- `build/Audio.types.d.ts` and `build/AudioModule.types.d.ts`: the `duration` field and the two events.

In the app, the adapter creates the engine once with `keepAudioSessionActive` and keeps it across tracks (the controller pauses it between tracks and only `stop` releases it), sets the audio mode to background, silent switch and `doNotMix`, and the `expo-audio` config plugin is listed with background playback on and the microphone off. `core` drives the lock screen through the player port (`setNowPlaying`, `remoteNext`, `remotePrevious`). This partially supersedes ADR 004's consequence "No patch to native dependencies in CI".

## Consequences

- Remove the patch when an expo-audio release lets a single `AudioPlayer` handle the lock screen's next and previous and show a caller-provided duration (or reports the real duration of these streams on iOS). On every expo-audio upgrade pnpm stops the install if the patch no longer applies (as ADR 028 says), which surfaces the question.
- A change to the patch, to the version or to the plugin options needs a new native build (`docs/building.md`).
- Expo Go runs the unpatched module: no remote next and previous, and its lock screen, if shown, carries the engine's duration.
- The Swift and Kotlin hunks are compiled only by the native build, not by the gate.
- The audio session stays active while paused until stop, so another app's audio is not told to resume.
