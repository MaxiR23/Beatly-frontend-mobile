# Track menu

The more button of every track row and the player header, the menu it opens, the playlist picker and the credits.

## Purpose

Act on one track from anywhere it is listed: like it or remove the like, add it to a playlist (an existing
one or a new one), go to its artist or its album, read its credits and, inside an own playlist, remove it from
that playlist, and report a problem with it (always offered, last; `bug-reports.md`). The menu lists only the items that apply to the track. A track missing what a route requires does not
offer that item: Like and Remove from Liked need `likeInputOf` to map (a first artist with an id, album, album id and
cover; every artist is sent, a later one with id null included), Add to a playlist needs `addTrackInputOf` (the same plus a duration), Go to artist needs the first artist's id (the primary artist; conventions.md, Track artists) and opens it; a later artist is never linked, and one without an id is drawn by name only,
Go to album needs an album id. Credits and Report a problem are always offered. The player also draws a heart beside the title with the
same rule as Like (`likes.md`).

Every screen with track rows (album, playlist, artist, search, the player's up next and related) renders one
`TrackMenuHost`, which owns the sheets and a brief notice, and one `TrackMenuButton` per row.

## Layout

Token names only.

- Button: an `IconButton` `more` (three vertical dots on Android, the horizontal ellipsis on iOS without the native module; `layout.controlHeight`, `icon.size.lg`) at the end of the row, outside the row's pressable body.
- Menu sheet: a `Sheet` on a `GlassSurface` `sheet` on iOS (`radius.lg`, `spacing.xl` padding, `spacing.lg` gap): a `MediaRow` header
  with the track (its song row draws `image.small`), then one `ActionRow` per item (`layout.controlHeight` tall, `layout.gap` between the icon and the label,
  `typography.body`, the icon at `icon.size.md`; the heart filled when liked; Remove from this playlist in `color.status.error`).
- Playlist picker: a `Sheet` kept `topInset` below the status bar; `typography.subtitle` title, a New playlist `MediaRow` (`size="medium"`,
  the plus tile), then the playlists as `MediaRow`s of `layout.rowCoverMedium`; a playlist that holds the track has a trailing
  check in `color.status.success` and is not pressable. The new playlist form is an `Input`, Cancel and Create as `Button`s of shape `field`.
- Report item: the `flag` glyph in the `ActionRow` and the SF Symbol `flag` in the iOS menu; it opens the report form (`bug-reports.md`) with the track's title.
- Credits: a `Sheet` with `typography.subtitle` title and a scrolling list: each section title in `typography.rowTitle` and its names in `typography.body`, `color.text.secondary`, `spacing.lg` between sections.
- Notice: a `Notice`, a check or an x (`icon.size.md`, `color.status.success` or `color.status.error`) and one `typography.meta` line,
  floating on a `GlassSurface` `bar` `layout.gutter` from the sides and `spacing.md` above the bottom inset, for `motion.duration.notice`. On Android: the Material 3 snackbar (inverse surface, extra-small corners, no glyph, the message from the start), at the same place and for the same time (ADR 027).
- The title of the player and of the mini player scrolls with `Marquee` (`motion.marquee.speed`, `motion.marquee.pause`) only when it does not fit.

## Platform differences

- Android: the notice is the Material 3 snackbar (`color.surface.inverse`, `radius.xs`, no glyph); iOS keeps the glass bar with the check or the x (ADR 027).

- iOS with the `ExpoUI` native module: the system menu (`NativeMenu`, `@expo/ui`, ADR 023), one button per item with an SF Symbol, the remove item destructive (red). The three dots take `color.text.primary` through the `Host` seed color, like the other icons, never the system tint.
- Android, and any build without the `ExpoUI` module (Expo Go, an old development build): the `Sheet` with `ActionRow`s; the button draws three vertical dots on Android and the horizontal ellipsis on iOS without the module (ADR 027).
- The sheets open from inside the player route, which is a native `transparentModal`.

## States

The picker:

| State            | What is drawn                                                                                                                                          | i18n keys                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Loading          | `LoadingState` under the title and the New playlist row                                                                                                | `common:loading`                                                                                                  |
| With data        | the playlists, the ones holding the track checked; a tap adds, then a confirmation replaces the body and the sheet closes                              | `trackMenu:picker.title`, `trackMenu:picker.newPlaylist`, `trackMenu:picker.inPlaylist`, `trackMenu:picker.added` |
| Expected empty   | `EmptyState` under the New playlist row                                                                                                                | `trackMenu:picker.empty`                                                                                          |
| Error with retry | `ErrorState`; retry refetches the query that failed. A failed add is an inline `typography.meta` line in `color.status.error` and the sheet stays open | `common:error.generic`, `common:retry`                                                                            |

New playlist: `trackMenu:picker.name`, `trackMenu:picker.nameTooLong`, `trackMenu:picker.create`, `trackMenu:picker.cancel`.

The credits:

| State            | What is drawn                                                                    | i18n keys                                           |
| ---------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| Loading          | `LoadingState`                                                                   | `common:loading`                                    |
| With data        | each section with a non-empty `names`, the four typed ones then `other_sections` | `trackMenu:credits.title`, `player:artistSeparator` |
| Expected empty   | `EmptyState` when no section has names                                           | `trackMenu:credits.empty`                           |
| Error with retry | `ErrorState`; retry refetches                                                    | `common:error.generic`, `common:retry`              |

A failed like or a failed remove draws the floating notice with `common:error.generic`. The button's label is `trackMenu:more` and the sheets' close label `trackMenu:close`.

## Data

| Route                                      | Paginated | Cache-Control                            | Reasons listed                                                                                                                 | Branches on                                                                                 |
| ------------------------------------------ | --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `GET /tracks/{id}/credits`                 | no        | `max-age` (at most 24 h); 404 `no-store` | `track_not_found`, `unauthorized`, `upstream_error`, `upstream_timeout`                                                        | none: every failure is `common:error.generic` with retry                                    |
| `GET /playlists`                           | yes       | `private, no-cache`                      | `invalid_request`, `invalid_cursor` (the helper), `unauthorized`, `upstream_*`                                                 | none                                                                                        |
| `GET /playlists/owned-with-track/{id}`     | no        | `private, no-cache`                      | `unauthorized`, `upstream_error`, `upstream_timeout`; `playlist_ids: []` is the empty                                          | none                                                                                        |
| `POST /playlists`                          | no        | `private, no-cache`                      | `invalid_request`, `unauthorized`, `upstream_*`                                                                                | none                                                                                        |
| `POST /playlists/{id}/tracks`              | no        | `private, no-cache`                      | `track_already_in_playlist` (409), `order_key_conflict`, `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_*` | `track_already_in_playlist`, turned into a success in `core` (counted as added, no message) |
| `DELETE /playlists/{id}/tracks/{track_id}` | no        | `private, no-cache`                      | `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_*`; idempotent, `data: null`                                | none                                                                                        |
| `POST /bug-reports`                        | no        | `private, no-cache`                      | `invalid_request`, `unauthorized`, `upstream_*`                                                                                | none                                                                                        |
| `POST /likes`, `DELETE /likes/{id}`        | no        | `private, no-cache`                      | see `likes.md`                                                                                                                 | the service's outcome kind, never a reason                                                  |

Adding a track, removing one and creating a playlist refresh the library, the caller's playlists, that playlist's header and
tracks, and which playlists hold the track. A playlist created but left empty because the add failed still appears after the refresh.

## Navigation

Go to artist and Go to album push `/artist/[id]` and `/album/[id]` in the current tab. From the player, the player closes first.

## i18n namespace

`trackMenu` (`items.report` included), `common`, `bugReports` and `player:artistSeparator`.

## Checked by hand

The iOS system menu opening from the button with its SF Symbols and the destructive red; the three dots in the icon color, not the system blue; whether Expo Go ships the `ExpoUI` module (the sheet is the fallback);
the marquee's real motion and its ellipsis under the system Reduce Motion setting; a sheet opened from inside the player route, including that the sheets mount on open and unmount on close, and the swap from the menu to the picker, the credits or the report form (ADR 023);
the notice above the iOS 26 tab accessory and the Android floating bar; screenshots of the heart, the menu, the picker and the credits on iOS and Android.

The three vertical dots on Android (ADR 027). The Android snackbar's look over the floating bar, with and without the mini player.

## The sheet on Android

On Android the `Sheet` is the Material 3 modal bottom sheet (ADR 027, `ui` `Sheet`): attached to the bottom and side edges on `color.surface.raised`, `radius.xl` top corners, a `layout.modalHandleZoneAndroid` handle zone with a `layout.modalHandleWidthAndroid` x `layout.handleHeight` handle in `color.overlay.handleAndroid`, `spacing.xl` side padding, and the content above the bottom inset. A drag down from the handle zone (the only drag zone, so a scrolling list keeps its own scroll) closes it past `motion.dragToClose.*` and springs back with `motion.spring` short of it; the scrim and the system back close it; under reduce motion it has no enter or exit animation and does not follow the finger. iOS keeps the floating glass sheet and slides whatever reduce motion says. The menu sheet's header `MediaRow` is `size="menu"` there (a `layout.rowCoverMenu` cover, `radius.sm`, `layout.gutter` at the sides, full width), with a `border.hairline` divider in `color.surface.border` under it and `spacing.xs` below the divider. The `ActionRow`s are `layout.actionRowHeightAndroid` tall, full width, with an `icon.size.actionRowAndroid` icon and `spacing.lg` before the label. The picker and credits sheets keep their content as above.

Left to verify by hand. On an Android phone: the sheet meeting the bottom and side edges and the content ending above the gesture bar, the drag feel and the spring back on a finger, the system back closing it, and the scroll of a long list next to the handle zone.

On Android the `Input`s are the Material 3 outlined text field (ADR 027, `ui` `Input`; see DESIGN.md, Text field): outline, label inside rising onto it on focus or with text, accent outline on focus, error color and the error under the field; iOS unchanged. Left to verify by hand on an Android phone: the label animation feel, the notch over the sheet surface, TalkBack reading the label once and announcing the error.
