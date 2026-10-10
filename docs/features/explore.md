# Explore

The explore tab: the list of genres.

## Purpose

Show every genre in the order the API sends them and open a genre's playlists
from a row.

## Layout

- Header: `layout.gutter` on the sides, `spacing.sm` vertical, the title in
  `typography.title` at the start and the account avatar (`AccountButton`, shared
  with Home) at the end. It is drawn in every state.
- Row (`GenreRow`): `layout.gutter` on the sides, `spacing.md` vertical,
  `layout.gap` between its parts. A vertical bar `layout.genreBarWidth` by
  `layout.genreBarHeight`, `radius.full`, on the `genrePalette[slug]` gradient or
  its `fallback`; the name in `typography.display`, one line; a `chevronRight`
  icon in `icon.size.md` and `color.text.tertiary`.
- Divider: `border.hairline` in `color.surface.border` under each row.
- Bottom: the list clears the floating tab bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

The tab bar differs between iOS 26+ (native tabs) and elsewhere (floating bar);
see `tabs.md`.

## States

| State            | What is drawn                                 | i18n keys                              |
| ---------------- | --------------------------------------------- | -------------------------------------- |
| Loading          | `LoadingState`                                | `common:loading`                       |
| With data        | the genre rows in API order                   | `explore:title`                        |
| Expected empty   | `EmptyState` with the compass icon, no action | `explore:empty`                        |
| Error with retry | `ErrorState`; retry refetches the genres      | `common:error.generic`, `common:retry` |

The avatar and its sheet use `common:account.open`, `common:account.close`,
`common:account.report`, `common:account.myReports` and `common:account.logout`;
the two report entries open the form and My reports (`bug-reports.md`).

## Data

| Route         | Paginated                                        | Cache-Control | Reasons listed                       | Branches on                      |
| ------------- | ------------------------------------------------ | ------------- | ------------------------------------ | -------------------------------- |
| `GET /genres` | single page, never a cursor, no `limit`/`cursor` | `no-store`    | `upstream_error`, `upstream_timeout` | none; all draw the generic error |

No genres is `ok: true` with `items: []`: an expected empty state, never a retry.

## Navigation

Route `/explore`, the second tab. A row pushes `/explore/genres/[slug]` with the
`slug` and the `name` as params. The stack is the shared one of the four tabs
(ADR 020), so the album route also resolves inside this tab.

## i18n namespace

`explore` and `common`.

## Checked by hand

The palette gradients in the bar, the shared stack under the iOS 26 native tabs
with the swipe-back gesture, the last row clearing the tab bar, and the `display`
name fitting one line on a small screen. Screenshots with data, empty, in es and
en, on iOS and Android, are in the pull request.
