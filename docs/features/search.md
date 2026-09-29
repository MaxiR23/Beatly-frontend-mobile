# Search

The search tab: recent queries kept on the device, and the top artist, songs and albums of a query.

## Purpose

Find music by text. While the field is empty the user sees their recent queries and can run,
remove or clear them. With text, the screen shows the top artist, the songs and the albums the
API returns. Nothing in the results is pressable yet: playback and detail screens are later
issues.

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
- Bottom: the list clears the floating tab bar with `floatingTabBarClearance`.

The top artist circle draws `data.artist.thumbnail_url`, or the `Cover` placeholder when it is null
(including responses cached before the field existed, for up to an hour).

## Platform differences

The tab bar differs between iOS 26+ (native tabs) and elsewhere (floating bar); see `tabs.md`.

## States

| State            | What is drawn                                                           | i18n keys                                                                                   |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Loading          | `LoadingState`, while the recents load, or while debouncing or fetching | `common:loading`                                                                            |
| With data        | recents newest first; or artist, songs, albums                          | `search:recent.title`, `search:songs`, `search:albums`, `search:artist`, `search:song.meta` |
| Expected empty   | no recents: `EmptyState`; no results: `EmptyState` with the query       | `search:recent.empty`, `search:empty`                                                       |
| Error with retry | `ErrorState`; retry reloads the recents or the search                   | `common:error.generic`, `common:retry`                                                      |

A failed add, remove or clear shows an inline `common:error.generic` line above the recents. The
search field uses `search:placeholder` and `search:clear`; row buttons use `search:recent.remove`.

## Data

| Route                | Paginated                                              | Cache-Control                                                     | Reasons listed                                                          | Branches on                      |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `GET /search?q=text` | no (`artist` and two whole lists, no `limit`/`cursor`) | `max-age` of the seconds left, at most 3600; `no-store` on errors | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout` | none; all draw the generic error |

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

Route `/search`, the third tab. Nothing in the screen navigates.

## i18n namespace

`search` and `common`.

## Checked by hand

Recents surviving an app kill and relaunch on iOS and Android, the debounce feel and the
keyboard's "search" return key, tapping a recent row with the keyboard open, the on-screen heights
of the bar and rows, the artist image from the real API, album covers from the real API, the last row
clearing the tab bar, and results in es and en on iOS 26+ and Android.
