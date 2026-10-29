# Bug reports

The report form and the list of the caller's own reports, both sheets, and All reports, the triage screen for developers and admins.

## Purpose

Report a problem from the account sheet or from a track's menu, and see one's own reports with their status.
The form takes a category and a description; from the track menu it also carries the track.
A developer or an admin also sees every report in All reports, filtered by all, open or closed, opens one in full and closes or reopens it.

## Layout

Token names only.

- Form: a `Sheet` kept `topInset` below the status bar; `typography.subtitle` title, `spacing.lg` between the parts. With a track, its title as
  a `typography.meta` line in `color.text.secondary`. The category as a `typography.label` caption over `Chip`s (the Material 3 filter chip on Android, see `DESIGN.md` Filter chip) that wrap, `spacing.sm` apart;
  the description as a multiline `Input` at least `layout.textAreaHeight` tall; the counter and the inline error as `typography.meta` lines
  (`color.text.secondary` or `color.status.error`); Cancel and Send as `Button`s of shape `field`, `spacing.md` apart.
- List: a `Sheet` with a `typography.subtitle` title and a scrolling list of `MediaRow`s (`size="medium"`) with the `flag` tile; the subtitle joins the date,
  what it is about and the description; the `Badge` sits trailing (`typography.label` on `color.overlay.subtle`, `radius.sm`; open in `color.text.primary`, closed in `color.text.tertiary`).
- All reports: a full-screen route; a header with a back `IconButton` (`back`) and a `typography.title` title, a row of `Chip`s (the Material 3 filter chip on Android, see `DESIGN.md` Filter chip; `spacing.sm` apart, `layout.gutter` inset)
  and a list of `MediaRow`s as in My reports, the subtitle joining the reporter, the date and the description, with the `Badge` trailing.
- Report detail: a `Sheet` kept `topInset` below the status bar; `typography.subtitle` title with the status `Badge`, `typography.label` captions in `color.text.secondary`
  over `typography.body` values (`spacing.xxs` apart, `spacing.lg` between pairs), a `Button` of shape `field` to close or reopen, and an inline `typography.meta` line in `color.status.error` for a failure.

## Platform differences

In the code, only All reports' back button: an arrow on Android, the chevron on iOS (ADR 027). The swap of sheets and the keyboard over the multiline field are checked by hand.

## States

The form:

| State   | What is drawn                                                                                                       | i18n keys                                                                                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editing | the category chips, the description, Send disabled until a category and 5 to 2000 characters, the counter from 1800 | `bugReports:form.title`, `bugReports:form.about`, `bugReports:form.category`, `bugReports:form.description`, `bugReports:form.tooShort`, `bugReports:form.tooLong`, `bugReports:form.counter`, `bugReports:form.send`, `bugReports:form.cancel`, `bugReports:form.close`, `bugReports:categories.*` |
| Sending | the Send spinner; a second press does nothing                                                                       |                                                                                                                                                                                                                                                                                                     |
| Sent    | a `Notice` replaces the body; the sheet closes after `motion.duration.notice`                                       | `bugReports:form.sent`                                                                                                                                                                                                                                                                              |
| Failed  | an inline `typography.meta` line in `color.status.error`; the sheet stays open and the input is kept                | `common:error.generic`                                                                                                                                                                                                                                                                              |

The list:

| State            | What is drawn                                                                      | i18n keys                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Loading          | `LoadingState` under the title                                                     | `common:loading`                                                                                                                   |
| With data        | the reports, newest first, each with its category, date, entity, excerpt and badge | `bugReports:list.title`, `bugReports:list.date`, `bugReports:list.entity.*`, `bugReports:list.status.*`, `bugReports:categories.*` |
| Expected empty   | `EmptyState` with the `inbox` glyph                                                | `bugReports:list.empty`                                                                                                            |
| Error with retry | `ErrorState`; retry refetches                                                      | `common:error.generic`, `common:retry`                                                                                             |

All reports:

| State            | What is drawn                                                                            | i18n keys                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading          | `LoadingState` under the filters                                                         | `common:loading`                                                                                                                                 |
| With data        | the reports as the API sends them, each with category, reporter, date, excerpt and badge | `bugReports:triage.title`, `bugReports:triage.filters.*`, `bugReports:triage.username`, `bugReports:triage.unknownReporter`, `bugReports:list.*` |
| Expected empty   | `EmptyState` with the `inbox` glyph, one message per filter                              | `bugReports:triage.empty.all`, `bugReports:triage.empty.open`, `bugReports:triage.empty.closed`                                                  |
| Error with retry | `ErrorState`; retry refetches                                                            | `common:error.generic`, `common:retry`                                                                                                           |
| Not allowed      | `EmptyState` with the `flag` glyph and no retry, on `forbidden`                          | `bugReports:triage.forbidden`                                                                                                                    |

The report detail:

| State     | What is drawn                                                            | i18n keys                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle      | the pairs, the status badge and Close report or Reopen report            | `bugReports:triage.detail.title`, `bugReports:triage.detail.description`, `bugReports:triage.detail.category`, `bugReports:triage.detail.reporter`, `bugReports:triage.detail.entity`, `bugReports:triage.detail.date`, `bugReports:triage.detail.close`, `bugReports:triage.detail.reopen`, `bugReports:triage.detail.dismiss` |
| Changing  | the badge and the button already show the new status; the button spinner |                                                                                                                                                                                                                                                                                                                                 |
| Forbidden | the old status again and an inline line                                  | `bugReports:triage.detail.forbidden`                                                                                                                                                                                                                                                                                            |
| Not found | the old status again and an inline line                                  | `bugReports:triage.detail.notFound`                                                                                                                                                                                                                                                                                             |
| Failed    | the old status again and the generic inline line                         | `common:error.generic`                                                                                                                                                                                                                                                                                                          |

## Data

| Route                                   | Method | Paginated                                                                       | Cache-Control                          | Reasons listed                                                                                                           | Branches on                                                                                                                                 |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/bug-reports`                          | POST   | no                                                                              | `private, no-cache`; errors `no-store` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                                                  | none: `common:error.generic` inline, the form kept                                                                                          |
| `/bug-reports/me`                       | GET    | yes, through `useInfiniteList`                                                  | `private, no-cache`; errors `no-store` | `invalid_request`, `invalid_cursor` (the helper restarts), `unauthorized`, `upstream_*`                                  | none: `common:error.generic` with retry                                                                                                     |
| `/bug-reports` (`?status=open\|closed`) | GET    | yes, through `useInfiniteList`; each filter is its own list from the first page | `private, no-cache`; errors `no-store` | `invalid_request`, `invalid_cursor` (the helper restarts, keeping the status), `unauthorized`, `forbidden`, `upstream_*` | `forbidden`: `bugReports:triage.forbidden`; the rest `common:error.generic` with retry                                                      |
| `/bug-reports/{report_id}`              | PATCH  | no                                                                              | `private, no-cache`; errors `no-store` | `invalid_request`, `unauthorized`, `forbidden`, `report_not_found`, `upstream_*`                                         | `forbidden`: `bugReports:triage.detail.forbidden`; `report_not_found`: `bugReports:triage.detail.notFound`; the rest `common:error.generic` |

The status filter is not on the backend yet; All reports sends no `status` for all.
The optimistic patch rewrites `status` across every cached filter and invalidates them all once settled; changing the filter opens its own list from the first page.

The POST body is the category, the description and, with a track, `entity_type` and `entity_id` together. A sent report refetches the list.

## Navigation

The account sheet (Home, Explore, Search, Library) opens the form or the list in its place; the track menu opens the form with the track.
The route `/bug-reports` sits in each tab's stack and is reached from the account sheet only when the profile's role is `developer` or `admin` (`common:account.allReports`).

Why sheets and not routes: the report form and My reports stay sheets, as most sheets in the app mount on open. All reports is a route because the list can be long, like the profile and the edit mode. Mounting on open also resets the form for free, with no state to clear between reports.

Dates: the first date drawn in the app is the report date in My reports. It uses i18next's datetime formatter (`{{date, datetime}}` with `formatParams: { date: { dateStyle: "medium" } }`), so the locale is chosen inside i18n and the screen never reads it. `reportDate` trims fractional seconds beyond milliseconds before parsing, because the backend sends microseconds. Later dates follow the same shape.

## i18n namespace

`bugReports` (`form.*`, `list.*`, `triage.*`), `common` (`account.report`, `account.myReports`, `account.allReports`) and `trackMenu` (`items.report`).

## Checked by hand

The Android chip on a phone: 32 tall, 8 corners, outline, the check, the ripple inside the corners, TalkBack reading selected.

All reports against the backend with its status filter: the three filters, `forbidden` after a role change, closing and reopening, the role gate for user, tester, developer and admin accounts, the `eye` glyph in the account sheet, and VoiceOver/TalkBack on the chips, rows, badge and action.

Sending a report from the account sheet and from a track's menu against the real API, then opening My reports and seeing both, newest first, the second marked as a track;
the sheet swaps (account sheet to form or list, track menu to form, including from the player route); the multiline field above the keyboard on iOS and Android;
the `flag` SF Symbol in the iOS system menu; the date in both languages on Hermes and that the database's microsecond timestamps are read; screen reader reading of the chips, the counter and the badge.

The Android back arrow on All reports, and the chevron unchanged on iOS (ADR 027).

## The sheet on Android

On Android the `Sheet` is the Material 3 modal bottom sheet (ADR 027, `ui` `Sheet`): attached to the bottom and side edges on `color.surface.raised`, `radius.xl` top corners, a `layout.modalHandleZoneAndroid` handle zone with a `layout.modalHandleWidthAndroid` x `layout.handleHeight` handle in `color.overlay.handleAndroid`, `spacing.xl` side padding, and the content above the bottom inset. A drag down from the handle zone (the only drag zone, so a scrolling list keeps its own scroll) closes it past `motion.dragToClose.*` and springs back with `motion.spring` short of it; the scrim and the system back close it; under reduce motion it does not follow the finger. On iOS the sheet is glass attached to the bottom and side edges like the system sheet, `radius.xl` top corners, its background reaching the bottom edge and its content the window's bottom inset plus `spacing.xl` above it. It opens and closes like the system sheet on both platforms: the backdrop fades in and out in place while only the sheet slides up on open and down on close, and under reduce motion both appear and disappear at once. On both platforms the sheet and its backdrop cover the tab bar and the mini player, and the sheet reads the window's insets, not a native tab's. The form, the list and the detail are the sheet above; the list and the detail scroll under the handle zone.

Left to verify by hand. On an Android phone: the sheet meeting the bottom and side edges and the content ending above the gesture bar, the drag feel and the spring back on a finger, the system back closing it, and the scroll of a long list next to the handle zone.

On Android the `Input`s are the Material 3 outlined text field (ADR 027, `ui` `Input`; see DESIGN.md, Text field): outline, label inside rising onto it on focus or with text, accent outline on focus, error color and the error under the field; iOS unchanged. Left to verify by hand on an Android phone: the label animation feel, the notch over the sheet (multiline) surface, TalkBack reading the label once and announcing the error.
