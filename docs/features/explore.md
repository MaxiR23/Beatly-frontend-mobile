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
`common:account.viewProfile`, `common:account.noName`, `common:account.profileRow`,
`common:account.report`, `common:account.myReports`, `common:account.allReports` (developers and admins only) and `common:account.logout`;
the profile row opens the profile (`profile.md`) and the three report entries open the form, My reports and All reports (developers and admins only), which opens the All reports screen (`bug-reports.md`).

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

## The sheet on Android

On Android the `Sheet` is the Material 3 modal bottom sheet (ADR 027, `ui` `Sheet`): attached to the bottom and side edges on `color.surface.raised`, `radius.xl` top corners, a `layout.modalHandleZoneAndroid` handle zone with a `layout.modalHandleWidthAndroid` x `layout.handleHeight` handle in `color.overlay.handleAndroid`, `spacing.xl` side padding, and the content above the bottom inset. A drag down from the handle zone (the only drag zone, so a scrolling list keeps its own scroll) closes it past `motion.dragToClose.*` and springs back with `motion.spring` short of it; the scrim and the system back close it; under reduce motion it does not follow the finger. On iOS the sheet is glass attached to the bottom and side edges like the system sheet, `radius.xl` top corners, its background reaching the bottom edge and its content the window's bottom inset plus `spacing.xl` above it. It opens and closes like the system sheet on both platforms: the backdrop fades in and out in place while only the sheet slides up on open and down on close, and under reduce motion both appear and disappear at once. On both platforms the sheet and its backdrop cover the tab bar and the mini player, and the sheet reads the window's insets, not a native tab's. The account sheet is `AccountButton`'s, as in `home.md`.

Left to verify by hand. On an Android phone: the sheet meeting the bottom and side edges and the content ending above the gesture bar, the drag feel and the spring back on a finger, the system back closing it, and the scroll of a long list next to the handle zone.
