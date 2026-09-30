# Genre

A genre's curated playlists, filtered by category.

## Purpose

Show a genre's playlists in a two-column grid and filter them by category chip.

## Layout

- Header: `layout.gutter` on the sides, `spacing.sm` vertical, `spacing.xs` gap.
  A back `IconButton`, a `layout.controlHeight` square with a `chevronLeft` icon
  in `icon.size.lg`, then the genre name in `typography.title`, one line. The
  name comes from the route param; without it (a deep link) no title is drawn.
- Chips: a horizontal row from `layout.gutter`, `spacing.sm` apart,
  `spacing.md` below. Each chip is `layout.chipHeight` high, `spacing.lg`
  horizontal padding, `radius.full`, label in `typography.button`. Selected:
  `color.accent.primary` with `color.text.inverse`; otherwise
  `color.surface.control` with `color.text.primary`. "All" comes first, then the
  categories in API order. The row is hidden when the genre has no categories.
- Filter: `items.filter(p => p.category === selected)` over the loaded page. A
  playlist with a null category shows only under All.
- Grid: two columns, `spacing.md` across and `spacing.lg` down, from
  `layout.gutter`. The card side is the window width minus both gutters and the
  gap, over two. Cover `radius.sm` on `color.surface.card`. Title in
  `typography.rowTitle`, the track count in `typography.meta` and
  `color.text.secondary`. Each card is pressable and opens the playlist screen.
- Cover rule: 4 `thumbnail_urls` draw a 2 x 2 mosaic; 1 to 3 draw the first; with
  none, `thumbnail_url` if there is one, else the placeholder.
- Bottom: the grid clears the floating tab bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

None beyond the tab bar described in `tabs.md`.

## States

The header is drawn in every state.

| State            | What is drawn                                                                                                            | i18n keys                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Loading          | `LoadingState` while either list loads                                                                                   | `common:loading`                       |
| With data        | the chips and the grid; the track count with plural forms                                                                | `genre:all`, `genre:tracks`            |
| Expected empty   | `EmptyState` when the genre has no playlists; when the selected category has none, `genre:emptyCategory` under the chips | `genre:empty`, `genre:emptyCategory`   |
| Error with retry | `ErrorState` when either list failed; retry refetches the failed ones                                                    | `common:error.generic`, `common:retry` |

The back button is labeled `genre:back`.

## Data

| Route                           | Paginated                                        | Cache-Control | Reasons listed                                          | Branches on                      |
| ------------------------------- | ------------------------------------------------ | ------------- | ------------------------------------------------------- | -------------------------------- |
| `GET /genres/{slug}/playlists`  | single page, never a cursor, no `limit`/`cursor` | `no-store`    | `genre_not_found`, `upstream_error`, `upstream_timeout` | none; all draw the generic error |
| `GET /genres/{slug}/categories` | single page, never a cursor, no `limit`/`cursor` | `no-store`    | `genre_not_found`, `upstream_error`, `upstream_timeout` | none; all draw the generic error |

`genre_not_found` is only reachable with a slug that did not come from
`/genres`, so it draws the generic error. No playlists or no categories is
`ok: true` with `items: []`: an expected empty state, never a retry.

## Navigation

Route `/explore/genres/[slug]?name=`, pushed from the Explore rows onto the
shared stack of the Explore tab (ADR 020). A grid card pushes
`/playlist/[id]?source=genre` with the playlist's `id`. Back pops
the stack, or replaces with `/explore` when there is nothing to go back to.

## i18n namespace

`genre` and `common`.

## Checked by hand

The grid clearing the floating tab bar, the plural forms on Hermes, and the
swipe-back gesture. Screenshots with data, empty and the empty category, in es
and en, on iOS and Android, are in the pull request.
