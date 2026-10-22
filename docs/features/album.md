# Album

An album's tracks and its related albums, on the detail screen base (which has a second, image hero, used by the artist).

## Purpose

Show an album: its cover, title, artists, meta line and tracks, and the albums
that are other versions of it or recommended with it. Opening another album
pushes a new album in the same tab. Pressing an available track plays the album from it
(`player.md`); a track without a `track_id` or with `is_available: false` is unavailable: not pressable, announced as `album:trackUnavailable`, and never enters the queue, so next, previous and shuffle skip it. A row between the info and the tracks plays the whole album from its first playable track with shuffle off, or shuffled from a random playable track with shuffle on; both register the album as a recent like a track press, and the album can be saved to the library from it. Every playable track ends with a more button that opens the track menu (`track-menu.md`); an unavailable track has none.

## Layout

- Collapse: the header collapses into the top bar on scroll (`DESIGN.md`, "Detail screen base"): the cover shrinks and fades, the bar is drawn on the dominant color. On iOS the floating back stays fixed and the bar is a strip with no back of its own, reaching from the top edge to `spacing.sm` past `spacing.xs` under the back's bottom edge, with no background: the dominant color and a light shade, both fading to transparent at its bottom edge. Under the strip the content is blurred slightly (`blur.detailStrip`), full at the top and fading to zero at the strip's bottom edge, appearing with the strip (`DESIGN.md`, "Detail screen base").
- Virtualization: the tracks are rows of the base's `FlatList` (`DESIGN.md`, "Detail screen base"), so a long album is virtualized: rows past the initial window render on scroll, already at rest, and the carousels (the slot after the rows) mount from the first render below a spacer. A fast scroll on a very long list is checked on device for blank rows.
- Entry: the content enters in a top-down cascade (`DESIGN.md`, "Detail screen base"): the cover over its wash, the title, the info and action row, the first 3 tracks (`motion.detailCascade.firstRows`), then the other tracks on screen with the carousels after them, `motion.detailCascade.*`. The tracks are rows of the base; the carousels are its slot after the rows and enter with the later tracks. At once when the album arrives, after the navigation transition when it was cached. Nothing moves under reduce motion.

Everything is drawn by `DetailScreen` (`DESIGN.md`, "Detail screen base"), except
the body:

- Hero: the cover (its single url passed as `cover.urls`) in `layout.heroCover`, `radius.sm`, `shadow.cover`, over the
  wash from the dominant color. Then the title in `typography.title`.
- Info: `layout.gutter` on the sides, `spacing.xs` gap, no padding below. The
  artist names in `typography.rowTitle` and `color.text.secondary` (a name with an id is a `Link`
  that pushes `/artist/[id]`, in `typography.link`; a name without one is plain text), joined by
  `album:artistSeparator`, omitted when there are none; then the meta line in
  `typography.meta` and `color.text.tertiary`: the kind, the year, the song count
  and the duration in hours and minutes, each omitted when the API sends none.
- Action row: `DetailActions` (`DESIGN.md`, "Detail screen base") between the info and the
  tracks, a centered group `layout.gap` apart: shuffle, play (`PlayButton`) and save (plus, or check when saved), both side buttons `layout.controlHeight`; when the pill shrinks (on the native driver, no layout animated) shuffle and save follow it toward the center and end `layout.gap` from the circle. No share,
  search or options button yet. Play and shuffle are disabled when no track is playable; save is
  disabled while its state loads or when reading it failed.
- Play button: idle (the album is not the playback source) it is a pill with the play glyph and
  `album:play`; pressing it plays the album from its first playable track. Pressed, the label fades out (`motion.playButton.labelFade`), then the `layout.playButtonPill` pill, holding the play glyph, shrinks to the circle (`motion.playButton.shrink`, ease in-out), even when the start is instant, and only then draws the spinner while the stream loads, or the pause glyph, scaling in over `motion.playButton.scaleIn`, if it already plays (a mid-track buffer shows the spinner too); playing it is a
  circle with the pause glyph, labelled `album:pause`, and pressing it pauses; paused it shows the
  play glyph and pressing it resumes. Once the list has ended (paused on its last track) pressing it restarts the list from position 0 of the current play order: the first track with shuffle off, the first of the shuffled order with shuffle on. Under reduce motion neither the fade, the shrink nor the scale-in animate.
- Tracks: one `TrackRow` per track in API order, a row of the base keyed by `track_number`. The
  number in a `layout.trackNumber` column, the title in `typography.rowTitle`, the
  artists in `typography.meta`. An unavailable track (no `track_id`, or `is_available: false`) draws in
  `color.text.disabled` and is announced as one element by `album:trackUnavailable`. The row of the
  current track (whoever started it) draws the now playing bars in place of its number, with no row background, and is announced as selected; the bars are frozen while paused and static under reduce motion.
- Carousels: other versions and recommended albums, each hidden when empty. A
  card is `layout.carouselCard` wide with a `radius.sm` cover; its subtitle is the
  artists, or the year when there are none.
- Sections are `spacing.xl` apart, and that one gap is also the space between the info
  (the end of the title block) and the tracks: nothing else adds to it. The action row adds `spacing.xl` under itself when there are tracks and the carousels `spacing.xl` above themselves, so every gap stays `spacing.xl`. The bottom clears the floating tab bar with
  `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

- iOS: the floating buttons use native glass on iOS 26+, `GlassSurface`'s solid
  fallback elsewhere. The back's native glass never fades (the back stays fixed); the top bar has no glass on any platform. On iOS the content under the top strip is blurred; Android has no blur.
- Android: the solid fallback draws the buttons.
- Expo Go: the native color module is missing, so the wash stays neutral.

## States

The floating back button is drawn in every state; with data, on Android it fades out on scroll and the top bar's back takes over; on iOS it stays fixed over the top bar.

| State            | What is drawn                                                                                  | i18n keys                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading          | `DetailSkeleton`, static                                                                       | `common:loading`                                                                                                                                                                                                              |
| With data        | the hero, title, info, tracks and the carousels; the song count with plural forms              | `album:kind`, `album:songs`, `album:durationMinutes`, `album:durationHours`, `album:otherVersions`, `album:recommended`, `album:trackUnavailable`, `album:play`, `album:shuffle`, `album:save`, `album:unsave`, `album:pause` |
| Expected empty   | `EmptyState` in the tracks section when `tracks` is `[]`; the rest of the album is still drawn | `album:empty`                                                                                                                                                                                                                 |
| Error with retry | `ErrorState`; retry refetches                                                                  | `common:error.generic`, `common:retry`                                                                                                                                                                                        |
| Unavailable      | `EmptyState` with no action, for `invalid_request`                                             | `album:notAvailable`                                                                                                                                                                                                          |

The back button is labeled `album:back`.

## Data

| Route                                  | Paginated                                   | Cache-Control                                             | Reasons listed                                                                                    | Branches on                                                                                      |
| -------------------------------------- | ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /album/{album_id}`                | no; tracks and referenced albums come whole | `max-age=<seconds left>`, at most 24 h; errors `no-store` | `invalid_request` (422), `unauthorized` (401), `upstream_error` (502), `upstream_timeout` (504)   | `invalid_request` draws `album:notAvailable`; everything else draws the generic error with retry |
| `GET /library/{kind}/{external_id}`    | no                                          | `private, no-cache`                                       | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                           | none; a failure leaves save disabled and draws nothing else                                      |
| `POST /library`                        | no                                          | `private, no-cache`                                       | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                           | none; a failure rolls the save button back                                                       |
| `DELETE /library/{kind}/{external_id}` | no                                          | `private, no-cache`                                       | `library_item_not_found`, `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout` | `library_item_not_found` leaves it not saved; anything else rolls the button back                |
| `POST /recents`                        | no                                          | `private, no-cache`                                       | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                           | none; a failure is logged and nothing is drawn                                                   |

A well-formed id that does not exist comes back as `upstream_error`, so it draws
the generic error. `tracks: []` with the album populated is `ok: true`: an
expected empty state, never a retry. The dominant color comes from the cover
through `adapters/imageColors.ts` (ADR 019), not from the API.

Save sends `{ kind: "album", source: "external", external_id, title, album_id, album_name }` with `thumbnail_url`, `artist` (the names joined by `album:artistSeparator`) and `artist_id` (the first artist's) only when the album has them. The button flips at once and rolls back if the write fails; a write settling refetches `library` and the saved state. Play sets shuffle off and shuffle sets it on before starting; a row press leaves the shuffle flag as it is.

Starting a list from a track registers it with `POST /recents`, and a failure never stops the music.

## Navigation

Route `/album/[id]`, declared once in the shared stack of the four tabs
(ADR 020). It opens from Home recently played, Search album results, Library saved
albums and from the carousels of another album, always inside the current tab.
An artist name with an id leads to the artist (`/artist/[id]`).
Back pops the stack, or replaces with `/` when there is nothing to go back to.

## i18n namespace

`album` and `common`.

## Checked by hand

The action row centered on iOS and Android, the shrink without dropped frames while playback starts, on iOS and Android, and a tap on shuffle and on the side button right after the shrink and at the middle of it (taps reach them, not play); the label fading and the play pill shrinking to a circle with shuffle and save following it, then scaling in as pause, the now playing bars moving, freezing on pause and static under reduce motion, a mid-track buffer on a slow network; saving, closing and reopening the album and finding it on the library screen; screenshots of the album at the top and scrolled, on iOS and Android, with the
collapsed header and top bar; the header collapse on scroll (the cover shrinking and fading, then the floating buttons, the title and the top bar, in that order, without dropped frames on iOS and Android); on iOS the floating back staying fixed and tappable at every scroll position, the title never under it, and the strip's fade matching the top of the wash and ending with no edge under the back, and the strip's transparent bottom catching taps over the first visible row (album, playlist); TalkBack focus moving from the floating buttons to the top bar after a scroll, and VoiceOver reaching the fixed back and the bar's title once collapsed; the bar title's legibility over bright dominant colors and the bar matching the top of the wash; the native glass on iOS 26+; the real
dominant color on a development build and the neutral fallback in Expo Go;
swipe-back per tab; and the native tab bar on iOS 26+ with the renamed tab
groups.

Also: the entry cascade on iOS and Android: its order, the 300 ms and 60 ms feel, the start after the push with cached data (back and reopen) and at once after the skeleton, no animation on rows of a later page, the floating buttons visible from the first frame with the native glass on iOS 26+, nothing moving under reduce motion, the header collapse unchanged after it. The tracks entering in two steps and the carousels with the second, the album at rest identical to before (with tracks, with no tracks, with no carousels).

Also: the iOS strip blur: absent at the top, fading in with the strip and following the scroll with no flicker or dark flash, full at the top and gone at the strip's bottom edge with no visible border or cut, about 4 points (tune `blur.detailStrip`), no change under reduce motion other than the strip's own, the floating back and the title above it unchanged, a development build rebuilt after the install.
