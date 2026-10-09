# Artist

An artist's popular songs, albums, singles and EPs, and similar artists, on the detail screen base.

## Purpose

Show an artist: a full-width image with the name over it, its popular songs, its albums, its
singles and EPs, and similar artists. Albums and singles push the album; a similar artist pushes
another artist in the same tab. Pressing a popular song with a `track_id` plays the popular songs from it (`player.md`); a song without one is unavailable: not pressable, without menu, announced as `artist:trackUnavailable`, and never enters the queue, so next, previous and shuffle skip it. Every playable popular song ends with a more button that opens the track menu (`track-menu.md`).

## Layout

Everything is drawn by `DetailScreen` (`DESIGN.md`, "Detail screen base"), except the body:

- Hero: the image variant, full width at `layout.heroImageRatio` on `color.surface.card`, faded into
  `color.surface.base`, the name over it in `typography.display`.
- Popular songs: a `spacing.md` column under a `typography.section` title with `layout.gutter` on
  the sides; one `MediaRow` per song in API order, a `layout.rowCover` cover, the title in
  `typography.rowTitle`, the album in `typography.meta`. A song without `track_id` draws in
  `color.text.disabled`.
- Albums, singles and EPs, similar artists: a `Carousel` each, a card `layout.carouselCard` wide;
  square covers with `radius.sm`, round for similar artists. The album subtitle is the year; the
  single subtitle is the kind and the year, each omitted when the API sends none.
- Sections are `spacing.xl` apart, and each empty one is hidden. The bottom clears the floating tab
  bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

- iOS: the floating buttons use native glass on iOS 26+, `GlassSurface`'s solid fallback elsewhere.
- Android: the solid fallback draws the buttons.

## States

The floating back button is drawn in every state.

| State            | What is drawn                                                                                           | i18n keys                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Loading          | `DetailSkeleton` image variant (full-width hero block, title bar at its bottom left, then rows), static | `common:loading`                                                                                                                         |
| With data        | the image hero and the four sections                                                                    | `artist:popular`, `artist:albums`, `artist:singles`, `artist:similar`, `artist:kind.single`, `artist:kind.ep`, `artist:trackUnavailable` |
| Expected empty   | each empty list hides its section; all four empty draw the hero and the name only                       |                                                                                                                                          |
| Error with retry | `ErrorState`; retry refetches                                                                           | `common:error.generic`, `common:retry`                                                                                                   |
| Unavailable      | `EmptyState` with no action, for `invalid_request`                                                      | `artist:notAvailable`                                                                                                                    |

The row of the current popular song (whoever started it) draws the now playing bars over its cover on a
scrim, with no row background; the bars are frozen while paused and static under reduce motion. An
unavailable song is never marked.

The back button is labeled `artist:back`.

## Data

| Route                     | Paginated                                         | Cache-Control                                             | Reasons listed                                                                                  | Branches on                                                                                       |
| ------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /artist/{artist_id}` | no; songs, albums, singles and related come whole | `max-age=<seconds left>`, at most 12 h; errors `no-store` | `invalid_request` (422), `unauthorized` (401), `upstream_error` (502), `upstream_timeout` (504) | `invalid_request` draws `artist:notAvailable`; everything else draws the generic error with retry |
| `POST /recents`           | no                                                | `private, no-cache`                                       | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                         | none; a failure is logged and nothing is drawn                                                    |

A well-formed id that does not exist comes back as `upstream_error`, so it draws the generic error.
Any of the four lists `[]` is `ok: true`: an expected empty state, never a retry.

Starting a list from a popular song registers it with `POST /recents`, and a failure never stops the music.

## Navigation

Route `/artist/[id]`, declared once in the shared stack of the four tabs (ADR 020). It opens from the
Search top artist, a Home artist recent, an album's artist names with an id, and similar artists.
Albums and singles push `/album/[id]`. Back pops the stack, or replaces with `/` when there is
nothing to go back to.

## i18n namespace

`artist` and `common`.

## Checked by hand

Screenshots of an artist on iOS and Android; the crop and fade on real artist images, the name's
legibility over bright images and the floating back button over the image; no white edge during a
push and a swipe-back in every tab, on the JS tab bar and on NativeTabs (iOS 26+); the now playing bars on a popular song, moving, frozen on pause and static under reduce motion.
