# Album

An album's tracks and its related albums, on the detail screen base (which has a second, image hero, used by the artist).

## Purpose

Show an album: its cover, title, artists, meta line and tracks, and the albums
that are other versions of it or recommended with it. Opening another album
pushes a new album in the same tab. Pressing an available track plays the album from it
(`player.md`); a track without a `track_id` or with `is_available: false` is unavailable: not pressable, announced as `album:trackUnavailable`, and never enters the queue, so next, previous and shuffle skip it. A row between the info and the tracks plays the whole album from its first playable track with shuffle off, or shuffled from a random playable track with shuffle on; both register the album as a recent like a track press, and the album can be saved to the library from it. Every playable track ends with a more button that opens the track menu (`track-menu.md`); an unavailable track has none.

## Layout

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
  tracks, in three slots with play in the exact center of the screen: shuffle, play (`PlayButton`) and save (plus, or check when saved), the side slots both `layout.controlHeight` wide and the center column always as wide as the play pill, so shuffle and save never move when it shrinks. No share,
  search or options button yet. Play and shuffle are disabled when no track is playable; save is
  disabled while its state loads or when reading it failed.
- Play button: idle (the album is not the playback source) it is a pill with the play glyph and
  `album:play`; pressing it plays the album from its first playable track. Pressed, it shrinks to
  the circle in `motion.duration.fast`, empty, and only then draws the spinner while the stream loads, or the pause glyph if it already plays (a mid-track buffer shows the spinner too); playing it is a
  circle with the pause glyph, labelled `album:pause`, and pressing it pauses; paused it shows the
  play glyph and pressing it resumes. Once the list has ended (paused on its last track) pressing it restarts the list from position 0 of the current play order: the first track with shuffle off, the first of the shuffled order with shuffle on. Under reduce motion neither the shrink nor the scale-in animate.
- Tracks: one `TrackRow` per track in API order, keyed by `track_number`. The
  number in a `layout.trackNumber` column, the title in `typography.rowTitle`, the
  artists in `typography.meta`. An unavailable track (no `track_id`, or `is_available: false`) draws in
  `color.text.disabled` and is announced as one element by `album:trackUnavailable`. The row of the
  current track (whoever started it) draws the now playing bars in place of its number, with no row background, and is announced as selected; the bars are frozen while paused and static under reduce motion.
- Carousels: other versions and recommended albums, each hidden when empty. A
  card is `layout.carouselCard` wide with a `radius.sm` cover; its subtitle is the
  artists, or the year when there are none.
- Sections are `spacing.xl` apart, and that one gap is also the space between the info
  (the end of the title block) and the tracks: nothing else adds to it. The bottom clears the floating tab bar with
  `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

- iOS: the floating buttons use native glass on iOS 26+, `GlassSurface`'s solid
  fallback elsewhere.
- Android: the solid fallback draws the buttons.
- Expo Go: the native color module is missing, so the wash stays neutral.

## States

The floating back button is drawn in every state.

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

The action row centered on iOS and Android, the play pill shrinking to a circle and scaling in as pause, the now playing bars moving, freezing on pause and static under reduce motion, a mid-track buffer on a slow network; saving, closing and reopening the album and finding it on the library screen; screenshots of the album at the top and scrolled, on iOS and Android, with the
floating buttons fixed over the hero; the native glass on iOS 26+; the real
dominant color on a development build and the neutral fallback in Expo Go;
swipe-back per tab; and the native tab bar on iOS 26+ with the renamed tab
groups.
