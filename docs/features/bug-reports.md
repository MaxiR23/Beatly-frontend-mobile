# Bug reports

The report form and the list of the caller's own reports, both sheets.

## Purpose

Report a problem from the account sheet or from a track's menu, and see one's own reports with their status.
The form takes a category and a description; from the track menu it also carries the track. There are no admin features:
changing a status and reading other users' reports are not in the app.

## Layout

Token names only.

- Form: a `Sheet` kept `topInset` below the status bar; `typography.subtitle` title, `spacing.lg` between the parts. With a track, its title as
  a `typography.meta` line in `color.text.secondary`. The category as a `typography.label` caption over `Chip`s that wrap, `spacing.sm` apart;
  the description as a multiline `Input` at least `layout.textAreaHeight` tall; the counter and the inline error as `typography.meta` lines
  (`color.text.secondary` or `color.status.error`); Cancel and Send as `Button`s of shape `field`, `spacing.md` apart.
- List: a `Sheet` with a `typography.subtitle` title and a scrolling list of `MediaRow`s (`size="medium"`) with the `flag` tile; the subtitle joins the date,
  what it is about and the description; the `Badge` sits trailing (`typography.label` on `color.overlay.subtle`, `radius.sm`; open in `color.text.primary`, closed in `color.text.tertiary`).

## Platform differences

None in the code. The swap of sheets and the keyboard over the multiline field are checked by hand.

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

## Data

| Route             | Method | Paginated                      | Cache-Control                          | Reasons listed                                                                          | Branches on                                        |
| ----------------- | ------ | ------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `/bug-reports`    | POST   | no                             | `private, no-cache`; errors `no-store` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                 | none: `common:error.generic` inline, the form kept |
| `/bug-reports/me` | GET    | yes, through `useInfiniteList` | `private, no-cache`; errors `no-store` | `invalid_request`, `invalid_cursor` (the helper restarts), `unauthorized`, `upstream_*` | none: `common:error.generic` with retry            |

The POST body is the category, the description and, with a track, `entity_type` and `entity_id` together. A sent report refetches the list.

## Navigation

No route. The account sheet (Home, Explore, Search, Library) opens the form or the list in its place; the track menu opens the form with the track.

Why sheets and not routes: most sheets in the app mount on open, and lists reached from a menu or another sheet are sheets too. Full-screen routes are kept for content entities (ADR 020). Mounting on open also resets the form for free, with no state to clear between reports.

Dates: the first date drawn in the app is the report date in My reports. It uses i18next's datetime formatter (`{{date, datetime}}` with `formatParams: { date: { dateStyle: "medium" } }`), so the locale is chosen inside i18n and the screen never reads it. `reportDate` trims fractional seconds beyond milliseconds before parsing, because the backend sends microseconds. Later dates follow the same shape.

## i18n namespace

`bugReports`, `common` (`account.report`, `account.myReports`) and `trackMenu` (`items.report`).

## Checked by hand

Sending a report from the account sheet and from a track's menu against the real API, then opening My reports and seeing both, newest first, the second marked as a track;
the sheet swaps (account sheet to form or list, track menu to form, including from the player route); the multiline field above the keyboard on iOS and Android;
the `flag` SF Symbol in the iOS system menu; the date in both languages on Hermes and that the database's microsecond timestamps are read; screen reader reading of the chips, the counter and the badge.
