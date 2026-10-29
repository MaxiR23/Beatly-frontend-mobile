# Search

The search tab: recent queries kept on the device, and the top artist, songs and albums of a query.

## Purpose

Find music by text. While the field is empty the user sees their recent queries and can run,
remove or clear them. With text, the screen shows the top artist, the songs and the albums the
API returns. An album card opens the album; pressing a song plays the songs from it with a `search` source named by the query (`player.md`). Every song row ends with a more button that opens the track menu (`track-menu.md`).

## Layout

- Header: `layout.gutter` on the sides, `spacing.sm` vertical, the title in `typography.title`
  and the account avatar (`AccountButton`) at the end. It is drawn in every state.
- Search bar (`SearchBar`): `layout.gutter` on the sides, `spacing.sm` below, `layout.controlHeight`
  tall, `radius.full`, `color.surface.card` with a `border.width` border in `color.surface.border`.
  A `search` icon in `icon.size.md` and `color.text.tertiary`, the text in `typography.body`, and a
  clear `IconButton` (`layout.controlHeight` square) while there is text.
- Recent header: `layout.gutter` on the sides, `spacing.sm` vertical, `typography.section` and a
  `Link` "Clear all" (also drawn under the error state of the recents).
- Recent row (`RecentRow`): `layout.gutter` at the start, `spacing.xs` at the end, `layout.gap`
  between parts; a `clock` icon, the query in `typography.body` in a pressable part, and a remove `IconButton` beside it (a sibling,
  not nested, so screen readers reach both).
- Top artist (`MediaRow`, large): a round `Cover` of `layout.rowCoverLarge`, the name in
  `typography.subtitle`, "Artist" in `typography.meta` and `color.text.secondary`.
- Song row (`MediaRow`): a `Cover` of `layout.rowCover` with `radius.sm`, the title in
  `typography.rowTitle`, artists and duration in `typography.meta`; `spacing.sm` above and below.
- Sections: `spacing.xl` between them, `spacing.md` between the songs header and its rows; the
  albums are a `Carousel`.
- Bottom: the list clears the floating tab bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

The top artist circle draws `data.artist.image` (`small`), or the `Cover` placeholder when it is null (including responses cached server-side before the field existed, for up to an hour); song rows draw `small` and album cards `medium`.

## Platform differences

The tab bar differs between iOS 26+ (native tabs) and elsewhere (floating bar); see `tabs.md`.

## States

| State            | What is drawn                                                           | i18n keys                                                                                   |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Loading          | `LoadingState`, while the recents load, or while debouncing or fetching | `common:loading`                                                                            |
| With data        | recents newest first; or artist, songs, albums                          | `search:recent.title`, `search:songs`, `search:albums`, `search:artist`, `search:song.meta` |
| Expected empty   | no recents: `EmptyState`; no results: `EmptyState` with the query       | `search:recent.empty`, `search:empty`                                                       |
| Error with retry | `ErrorState`; retry reloads the recents or the search                   | `common:error.generic`, `common:retry`                                                      |

The song row of the current track (whoever started it) draws the now playing bars over its cover on a
scrim, with no row background; the bars are frozen while paused and static under reduce motion.

A failed add, remove or clear shows an inline `common:error.generic` line above the recents. The
search field uses `search:placeholder` and `search:clear`; row buttons use `search:recent.remove`.

## Data

| Route                | Paginated                                              | Cache-Control                                                     | Reasons listed                                                          | Branches on                      |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `GET /search?q=text` | no (`artist` and two whole lists, no `limit`/`cursor`) | `max-age` of the seconds left, at most 3600; `no-store` on errors | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout` | none; all draw the generic error |

Playing a song registers no recent; its play is registered by the player (`player.md`).

Nothing found is `ok: true` with `artist: null`, `songs: []` and `albums: []`: an expected empty
state, never a retry. The query is debounced by `SEARCH_DEBOUNCE_MS` (300 ms) and the request runs
only for a non-empty trimmed text.

Recent queries are not API data. They live on the device under `beatly-recent-searches`, behind
the `storage` port. Rules: trimmed, an empty one is ignored, a repeat (any case) moves to the top,
newest first, at most 8. A query is recorded when the user submits it from the keyboard and when
they tap a recent row, never on a keystroke.

The recents are device-local data served through TanStack Query: the list is a query over the
service, and the add, remove and clear mutations write the list they return with `setQueryData`
instead of invalidating, so there is no refetch of the store. They are stored per device and
cleared on sign-out: after a successful sign-out the service clears the store and the cached list
is dropped, so the next account starts with none. A failed clear does not fail the sign-out.

A stored value that is not a list of strings is a typed `schema` failure and draws the error state
with retry. The state also draws "Clear all", which deletes the key without reading it; adding a
query over a corrupted value starts a fresh list, so the feature always recovers.

## Navigation

Route `/search`, the third tab. An album card pushes `/album/[id]` with the
result's `id`, inside the Search tab's stack; the top artist pushes `/artist/[id]` with its `id`. Nothing else in the screen navigates.

## i18n namespace

`search` and `common`.

## Checked by hand

Recents surviving an app kill and relaunch on iOS and Android, the debounce feel and the
keyboard's "search" return key, tapping a recent row with the keyboard open, the on-screen heights
of the bar and rows, the artist image from the real API, album covers from the real API, the last row
clearing the tab bar, results in es and en on iOS 26+ and Android, and the now playing bars on a song row, moving, frozen on pause and static under reduce motion.

## The sheet on Android

On Android the `Sheet` is the Material 3 modal bottom sheet (ADR 027, `ui` `Sheet`): attached to the bottom and side edges on `color.surface.raised`, `radius.xl` top corners, a `layout.modalHandleZoneAndroid` handle zone with a `layout.modalHandleWidthAndroid` x `layout.handleHeight` handle in `color.overlay.handleAndroid`, `spacing.xl` side padding, and the content above the bottom inset. A drag down from the handle zone (the only drag zone, so a scrolling list keeps its own scroll) closes it past `motion.dragToClose.*` and springs back with `motion.spring` short of it; the scrim and the system back close it; under reduce motion it does not follow the finger. On iOS the sheet is glass attached to the bottom and side edges like the system sheet, `radius.xl` top corners, its background reaching the bottom edge and its content the window's bottom inset plus `spacing.xl` above it. It opens and closes like the system sheet on both platforms: the backdrop fades in and out in place while only the sheet slides up on open and down on close, and under reduce motion both appear and disappear at once. On both platforms the sheet and its backdrop cover the tab bar and the mini player, and the sheet reads the window's insets, not a native tab's. The account sheet is `AccountButton`'s, as in `home.md`.

Left to verify by hand. On an Android phone: the sheet meeting the bottom and side edges and the content ending above the gesture bar, the drag feel and the spring back on a finger, the system back closing it, and the scroll of a long list next to the handle zone.
