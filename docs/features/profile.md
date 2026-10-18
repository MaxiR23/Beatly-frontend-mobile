# Profile

The caller's profile screen and the sheet that edits it.

## Purpose

See who you are in the app: the large avatar, the display name, the username, the role badge, the email and the month you joined. Edit the display name and the username
from a sheet. The avatars stay initials; photos, a language selector and deleting the account are not here.

## Layout

Token names only.

- Screen: `color.surface.base`, a header row of an `IconButton` `chevronLeft` and a `typography.title` title (`layout.gutter` sides, `spacing.xs` gap, `spacing.sm` vertical), then a scroll with `layout.gutter` sides and `spacing.xl` between the parts, clear of the tab bar.
- Identity: `Avatar` at `layout.profileAvatar` (initials in `typography.display`, or the `user` icon at `icon.size.xl`), `spacing.sm` apart: the name in `typography.title`, `@username` in `typography.body` and `color.text.secondary`, both centered, and the role `Badge` (`primary` tone) for every role but user.
- Card: a `Card` (`color.surface.raised`) with the email and Member since pairs, each a `typography.label` caption in `color.text.secondary` over a `typography.body` value, `spacing.xxs` apart. Under it, Edit profile as a `Button` of variant `secondary` and shape `field`.
- `ProfileSkeleton` and `SkeletonBar`: a `SkeletonCircle` at `layout.profileAvatar`, bars at `layout.skeletonBar` with the line height of their text role, in `color.surface.border`, bars `radius.sm`, circles `radius.full`, no motion. The email row's placeholder is a `typography.body` bar at `layout.skeletonBar.rowTitle`.
- Edit sheet: a `Sheet`, `typography.subtitle` title, `spacing.lg` between the parts; two `Input`s (the username with a fixed `@` prefix drawn before the entry, `color.text.secondary`), the inline error as a `typography.meta` line in `color.status.error`, Cancel and Save as `Button`s of shape `field`, `spacing.md` apart.

## Platform differences

None in the code. The sheet glass and the keyboard lift over the fields are checked by hand, as in `library.md`.

## States

The screen:

| State                                            | What is drawn                                                                                               | i18n keys                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| With data                                        | from the cache at once, kept on a failed background refetch                                                 | `profile:title`, `profile:username`, `profile:noUsername`, `profile:roles.*`, `profile:email`, `profile:memberSince`, `profile:memberSinceDate`, `profile:editProfile`, `common:account.noName` |
| Loading with no profile                          | `ProfileSkeleton`                                                                                           | `common:loading`                                                                                                                                                                                |
| Failed with no profile, or the email read failed | `ErrorState`; retry refetches                                                                               | `common:error.generic`, `common:retry`                                                                                                                                                          |
| The email row while the session is read          | a `SkeletonBar` under the `profile:email` caption                                                           | `profile:email`                                                                                                                                                                                 |
| Expected empty                                   | not applicable: the profile is one resource; its nulls draw No name and No username; no email omits its row | `common:account.noName`, `profile:noUsername`                                                                                                                                                   |

The order of the checks is the reverse of Genre, Album, Artist and Playlist, by the owner's decision: a cached profile is drawn first, then loading, then error.

The edit sheet:

| State          | What is drawn                                                                                                | i18n keys                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editing        | the name and username prefilled, Save disabled until something valid changed, the validation under the field | `profile:edit.title`, `profile:edit.name`, `profile:edit.namePlaceholder`, `profile:edit.nameTooLong`, `profile:edit.username`, `profile:edit.usernamePrefix`, `profile:edit.usernamePlaceholder`, `profile:edit.usernameTooShort`, `profile:edit.usernameTooLong`, `profile:edit.usernameInvalid`, `profile:edit.usernameRequired`, `profile:edit.cancel`, `profile:edit.submit`, `profile:edit.close` |
| Saving         | the Save spinner; a second press does nothing                                                                |                                                                                                                                                                                                                                                                                                                                                                                                         |
| Username taken | a message under the username field, for the rejected value only; the sheet stays open, the input is kept     | `profile:edit.usernameTaken`                                                                                                                                                                                                                                                                                                                                                                            |
| Failed         | an inline `typography.meta` line in `color.status.error`; the sheet stays open and the input is kept         | `common:error.generic`                                                                                                                                                                                                                                                                                                                                                                                  |

## Data

| Route         | Method | Paginated | Cache-Control                          | Reasons listed                                                                                                 | Branches on                                                                                                                      |
| ------------- | ------ | --------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/profile/me` | GET    | no        | `private, no-cache`; errors `no-store` | `profile_not_found`, `unauthorized`, `upstream_error`, `upstream_timeout`                                      | none: `common:error.generic` with retry                                                                                          |
| `/profile/me` | PATCH  | no        | `private, no-cache`; errors `no-store` | `username_taken`, `invalid_request`, `profile_not_found`, `unauthorized`, `upstream_error`, `upstream_timeout` | `username_taken` maps to `profile:edit.usernameTaken`; every other reason and transport failure to `common:error.generic` inline |

The PATCH body carries only the changed keys: `display_name` (1 to 50 characters, or `null` to clear it) and `username` (3 to 30 of letters, numbers and underscores, never cleared). `avatar_url` is never sent.

The profile is the query the header avatar already holds. Opening the screen draws it and refetches it in the background (`private, no-cache`), never behind a loading state. A save refetches it before the sheet closes, so the header avatar, the account row, the profile screen and the own playlists' subtitle show the new values.

The email is `getEmail()` on the auth port, read from the stored session without the network, with no `Cache-Control` and the default stale time.

## Navigation

`/profile`, in the shared array group (ADR 020), reached from the account sheet's first row in any tab; back returns to the same tab. The edit sheet mounts on open.

## i18n namespace

`profile`, `common` (`account.noName`, `loading`, `error.generic`, `retry`).

## Checked by hand

Saving a name and a username against the real API, including a real 409, and seeing the header avatar, the account row and the screen change without reopening the app; the real stored session yielding the email in airplane mode;
Member since on Hermes in both languages with the database's microsecond timestamp; the sheet closing and the push to `/profile` on iOS 26 native tabs and on Android; the sheet above the keyboard; the `@` prefix alignment and the 96 avatar's look;
the skeleton blocks against the glass and the base surface, and their handoff to content on a throttled network; screen reader reading of the profile row, the badge and the prefixed field.
