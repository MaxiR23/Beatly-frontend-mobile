# Track menu

The more button of every track row and the player header, the menu it opens, the playlist picker and the credits.

## Purpose

Act on one track from anywhere it is listed: like it or remove the like, add it to a playlist (an existing
one or a new one), go to its artist or its album, read its credits and, inside an own playlist, remove it from
that playlist. The menu lists only the items that apply to the track. A track missing what a route requires does not
offer that item: Like and Remove from Liked need `likeInputOf` to map (an artist with an id, album, album id and
cover), Add to a playlist needs `addTrackInputOf` (the same plus a duration), Go to artist needs an artist with an id,
Go to album needs an album id. Credits is always offered. The player also draws a heart beside the title with the
same rule as Like (`likes.md`).

Every screen with track rows (album, playlist, artist, search, the player's up next and related) renders one
`TrackMenuHost`, which owns the sheets and a brief notice, and one `TrackMenuButton` per row.

## Layout

Token names only.

- Button: an `IconButton` `ellipsis` (`layout.controlHeight`, `icon.size.lg`) at the end of the row, outside the row's pressable body.
- Menu sheet: a `Sheet` on a `GlassSurface` `sheet` (`radius.lg`, `spacing.xl` padding, `spacing.lg` gap): a `MediaRow` header
  with the track, then one `ActionRow` per item (`layout.controlHeight` tall, `layout.gap` between the icon and the label,
  `typography.body`, the icon at `icon.size.md`; the heart filled when liked; Remove from this playlist in `color.status.error`).
- Playlist picker: a `Sheet` kept `topInset` below the status bar; `typography.subtitle` title, a New playlist `MediaRow` (`size="medium"`,
  the plus tile), then the playlists as `MediaRow`s of `layout.rowCoverMedium`; a playlist that holds the track has a trailing
  check in `color.status.success` and is not pressable. The new playlist form is an `Input`, Cancel and Create as `Button`s of shape `field`.
- Credits: a `Sheet` with `typography.subtitle` title and a scrolling list: each section title in `typography.rowTitle` and its names in `typography.body`, `color.text.secondary`, `spacing.lg` between sections.
- Notice: a `Notice`, a check or an x (`icon.size.md`, `color.status.success` or `color.status.error`) and one `typography.meta` line,
  floating on a `GlassSurface` `bar` `layout.gutter` from the sides and `spacing.md` above the bottom inset, for `motion.duration.notice`.
- The title of the player and of the mini player scrolls with `Marquee` (`motion.marquee.speed`, `motion.marquee.pause`) only when it does not fit.

## Platform differences

- iOS with the `ExpoUI` native module: the system menu (`NativeMenu`, `@expo/ui`, ADR 023), one button per item with an SF Symbol, the remove item destructive (red). The three dots take `color.text.primary` through the `Host` seed color, like the other icons, never the system tint.
- Android, and any build without the `ExpoUI` module (Expo Go, an old development build): the `Sheet` with `ActionRow`s.
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
| `POST /likes`, `DELETE /likes/{id}`        | no        | `private, no-cache`                      | see `likes.md`                                                                                                                 | the service's outcome kind, never a reason                                                  |

Adding a track, removing one and creating a playlist refresh the library, the caller's playlists, that playlist's header and
tracks, and which playlists hold the track. A playlist created but left empty because the add failed still appears after the refresh.

## Navigation

Go to artist and Go to album push `/artist/[id]` and `/album/[id]` in the current tab. From the player, the player closes first.

## i18n namespace

`trackMenu`, `common` and `player:artistSeparator`.

## Checked by hand

The iOS system menu opening from the button with its SF Symbols and the destructive red; the three dots in the icon color, not the system blue; whether Expo Go ships the `ExpoUI` module (the sheet is the fallback);
the marquee's real motion and its ellipsis under the system Reduce Motion setting; a sheet opened from inside the player route, including that the sheets mount on open and unmount on close, and the swap from the menu to the picker or the credits (ADR 023);
the notice above the iOS 26 tab accessory and the Android floating bar; screenshots of the heart, the menu, the picker and the credits on iOS and Android.
