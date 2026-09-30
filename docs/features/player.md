# Player

The mini player above the tab bar and the full-screen player.

## Purpose

Play music. Pressing a track row in an album, a playlist, the popular songs of an artist or a search
song plays its list from that track. The mini player shows what plays and opens the player, which
has the seek bar, previous, play or pause, next, shuffle and repeat one. A handle at the bottom of
the player pulls up a sheet with three tabs: Up next (the rest of the queue, then suggestions), Lyrics (synced lyrics
follow the song and a line tap seeks) and Related (songs, artists, albums). A tap on a row of the rest of the queue jumps
inside the current queue, keeping its order, shuffle and source; a tap on a suggestion or a related song plays that list
from it, under the source "Songs like <the current title>". Foreground playback only: background, the lock screen, likes
and track actions are later issues.

## Layout

- Mini player: `GlassSurface` `bar` tinted with the cover's dominant color, a round `Cover` of `layout.rowCover`,
  the title in `typography.rowTitle` and the artists in `typography.meta`, play or pause and next as `IconButton`s.
  No progress line. `spacing.md` above the floating tab bar.
- Player screen: `spacing.xl` sides; a `layout.controlHeight` header with the chevron-down close (`icon.size.lg`), "Playing from" in
  `typography.label` / `color.text.secondary` over the source in `typography.rowTitle`; a wash from the dominant color to
  `color.surface.base` by the middle of the screen (three stops); `spacing.xl` below, a square cover as wide as the
  content, `radius.md`, `shadow.cover`; `spacing.xxl` below, `typography.title` and `typography.body` in
  `color.text.secondary`; `spacing.xl` below, the seek bar; `spacing.lg` below, the controls spread across the width:
  shuffle and repeat at `icon.size.md` (`color.text.secondary`, `color.text.primary` on), previous and next filled at
  `icon.size.xl`, and play or pause in a `layout.playButton` circle in `color.accent.primary` with a `color.text.inverse`
  glyph. The column scrolls when it does not fit. Dragged down it follows the finger and closes past `motion.dragToClose.distanceShare` of the window height or above `motion.dragToClose.velocity`, springing back with `motion.spring` otherwise; the cover drops to `motion.pausedScale` while paused. Under reduce motion nothing moves or scales and the route fades. iOS has no close button.
- Sheet: the handle (`layout.handleWidth` x `layout.handleHeight`, `radius.full`, `color.overlay.muted`, centered in a
  `layout.controlHeight` row above the bottom inset) nudges `motion.handleNudge` with `motion.duration.base` and `motion.spring`
  the first three openings; the player darkens to `color.overlay.backdrop` and drops to `motion.behindSheetScale` with the
  sheet's position; the thresholds are `motion.dragToClose.*`; the panel has `radius.lg` top corners, `shadow.floating` and the
  wash from the dominant color to `color.surface.base`; the song row is a `layout.rowCoverMedium` cover (`radius.sm`),
  `typography.title`, `typography.body` in `color.text.secondary` and an `IconButton` `primaryCompact`; then a `SegmentedControl`;
  rows are `MediaRow`s; lyrics lines are `typography.title`, `color.text.primary` for the playing one and `color.text.tertiary`
  for the others; related artists and albums are `Carousel`s. Under reduce motion the sheet and the dim fade, nothing moves
  or scales, and the handle does not nudge.

## Platform differences

- iOS 26+: the mini player is `NativeTabs.BottomAccessory`, the system sizes the frame, draws the glass capsule and sets the gap to the tab bar; the mini player draws bare inside it (no own surface, no tint), clipped to the frame.
- Android and older iOS: the `accessory` of `FloatingTabBar`, at the pill's width (`floatingTabBarWidth`), `spacing.md` above the pill.
- iOS: no close button; the player closes by dragging down, or with the VoiceOver escape gesture.
- Android: the chevron-down close button stays, next to the drag; the system back closes too.
- Android, where the column scrolls: a drag that starts inside the column may be taken by the scroll; the header always closes.
- Foreground only (`shouldPlayInBackground: false`); `playsInSilentMode` is on.

## States

| State            | What is drawn                                                                                  | i18n keys                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Loading          | play button busy; the mini player likewise                                                     | `player:play`                                                                  |
| With data        | playing or paused, times, source, title, artists                                               | `player:playingFrom`, `player:searchSource`, `player:remaining`, `player:seek` |
| Expected empty   | player: `EmptyState` with the close button; mini player: not drawn                             | `player:empty`                                                                 |
| Error with retry | mini player: the error line; player: `ErrorState` in place of the seek bar and controls, retry | `player:error.unplayable`, `common:retry`                                      |

The with-data row also draws a track source as `player:trackSource`. The sheet's three tabs each draw their own four states:

| Tab     | Loading                                    | With data                                                           | Expected empty              | Error with retry                                                                 |
| ------- | ------------------------------------------ | ------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| Up next | `LoadingState` under the rest of the queue | the rest of the queue, then the suggestions                         | `player:sheet.upNextEmpty`  | `ErrorState` under the rest of the queue: `common:error.generic`, `common:retry` |
| Lyrics  | `LoadingState`                             | synced lines (playing one centered) or plain lines                  | `player:sheet.lyricsEmpty`  | `ErrorState`: `common:error.generic`, `common:retry`                             |
| Related | `LoadingState`                             | `player:sheet.songs`, `player:sheet.artists`, `player:sheet.albums` | `player:sheet.relatedEmpty` | `ErrorState`: `common:error.generic`, `common:retry`                             |

The sheet's own keys are `player:sheet.open`, `player:sheet.close`, `player:sheet.tabs.upNext`, `player:sheet.tabs.lyrics` and
`player:sheet.tabs.related`; loading uses `common:loading`.

## Data

The player itself calls no Beatly API route. The sheet reads three, each only when its tab is opened, not paginated, cached
per track for the `Cache-Control: max-age` they send (at most 6 h, 24 h and 12 h): `GET /tracks/{id}/upnext`,
`GET /tracks/{id}/lyrics` and `GET /tracks/{id}/related`. The reasons listed are `track_not_found`, `unauthorized`,
`upstream_error` and `upstream_timeout`; the sheet branches on none: every failure is `common:error.generic` with retry. The first
up next track is the current one and is not drawn. The nudge count is kept in storage under `beatly-sheet-nudges`, three openings. Every opening of the player with a track counts, under reduce motion too (only the animation is skipped), so three reduce-motion openings use the nudge up.

The stream URL is resolved on the device by `core`'s stream resolver (ADR 021): a POST to the
endpoint in `EXPO_PUBLIC_STREAM_ENDPOINT` with a 15-second timeout, carrying fixed locale fields and the identifier the endpoint last issued (kept in storage), taking the highest-bitrate `audio/mp4` on iOS and
`audio/mp4`, then `audio/webm`, on Android. A login-required refusal is retried once with a fresh identifier, or none; a second refusal is the error state. Nothing caches the URL; each start resolves again. The typed failure
(`unplayable`, `timeout`, `network`, `invalid_response`, or `playback` from the engine) maps to
`player:error.unplayable`. The queue is the tracks loaded when the row is tapped: a paginated playlist stops at its
loaded pages.

## Navigation

`/player`, a see-through modal (`transparentModal`) above the tabs that slides up, opened from the mini player. A downward drag from the header, or from the column at its top, closes it; a short one springs back. Close pops, or replaces with `/`. Under reduce motion the route fades in and out and the drag does not move the player. With the sheet open, Android back and the VoiceOver escape close the sheet first, with its reverse motion, and the player stays; a second back or escape closes the player.

An artist or an album of Related closes the player and pushes `/artist/[id]` or `/album/[id]` in the current tab.

## i18n namespace

`player` and `common`.

## Checked by hand

Audible playback, seek, pause and advance on a device with the three stream values set in `.env`; a track that keeps playing, or fails with the error state and a retry, after switching between Wi-Fi and cellular; the first play on a fresh install (no stored identifier) and after clearing the app's data; duration on fragmented MP4; the silent switch;
pause when the app goes to the background; the iOS 26+ bottom accessory (the mini player inside the system capsule, never over the tab bar, in regular and inline placement); the player layout at 375 x 667 (scrolls) and on a large phone (does not); the dominant-color tint
(neutral in Expo Go); the modal presentation; the drag's feel on iOS and Android (tabs visible behind the player, the native dismissal continuing from the finger, the spring back); a drag from the column at its top where it fits, and on 375 x 667 where it scrolls (Android may hand it to the scroll, the header must still close); a seek drag that never closes; a transport button press that still works; reduce motion on iOS and Android (the player fades, the drag does not move it, the cover does not scale); VoiceOver's escape gesture closing the player on iOS; screenshots of the three sheet tabs on iOS and Android; the feel of the drag up, the spring open and back, the dim and the scale tracking the finger, and the drag down from the header and from a list at its top; the nudge on a fresh install (three openings nudge, the fourth does not); synced lyrics staying centered as a real song plays, including long wrapped lines; an artist or album of Related landing in the current tab from each of the four tabs, including the iOS 26+ native tabs; reduce motion on the sheet (it fades, nothing moves or scales, no nudge); VoiceOver and TalkBack announcing the handle as "Up next, lyrics and related" while the player behind is not read with the sheet open; the pause scale's feel and no flicker between tracks; screenshots on iOS and Android.
