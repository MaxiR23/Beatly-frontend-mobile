# Library

The library tab: the fixed liked entry, the caller's own playlists and saved albums and playlists, and the create-playlist sheet.

## Purpose

The user sees everything they keep in one list, newest first after the fixed
"Liked songs" entry, and creates a playlist from the header button. A saved
album row opens the album; the liked, own and saved genre playlist rows open the
playlist screen; a playlist with another source is not pressable.

## Layout

- Header: `layout.gutter` horizontal and `spacing.sm` vertical padding, title
  in `typography.title`, at the end an `IconButton` (plus, `layout.controlHeight`
  square, `icon.size.lg`) and the `AccountButton`, `spacing.xs` apart.
- Rows: `MediaRow` size medium, cover `layout.rowCoverMedium` in `radius.sm`,
  `spacing.xs` vertical padding so the row is 64 high, `layout.gap` between
  cover and text, title in `typography.rowTitle`, meta in `typography.meta`
  with `color.text.secondary`. The list pads its end with
  `floatingTabBarClearance`.
- The liked entry draws a tile on `color.accent.primary` with a heart in
  `color.text.inverse`.
- Covers per `source`: `user` (own playlist) uses `thumbnail_urls` as is;
  saved albums and playlists use `thumbnail_url` as a single image, or the
  placeholder when it is null.
- Meta: `Playlist` alone for `liked`, never a name or "You"; `Playlist · <name>` for `user`, where the
  name is the profile's username or display name, and `Playlist` alone when
  there is none; otherwise `<Kind> · <subtitle>`
  when the API sends a `subtitle`, and `<Kind>` alone when it is null. The
  contract never ties a `source` to an owner name, so "Beatly" appears only if
  the API sends it as the subtitle.
- Sheet: `Sheet` on `GlassSurface`, `spacing.lg` gap, two `Input`s, a
  `SwitchRow` (track and thumb from `color.accent.primary` /
  `color.text.inverse` on, `color.surface.border` / `color.text.primary` off)
  and two field-shaped buttons side by side with `spacing.md` gap.

## Platform differences

The sheet glass is native on iOS 26+ and a solid fallback elsewhere. The sheet
lifts above the keyboard with padding on iOS; on Android the window resizes.

## States

| State            | What is drawn                                                         | i18n keys                                         |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| Loading          | `LoadingState`                                                        | `common:loading`                                  |
| With data        | the rows in the API's order                                           | `library:liked`, `library:kind.*`, `library:meta` |
| Expected empty   | the liked row plus an `EmptyState` (the library is never `items: []`) | `library:empty`                                   |
| Error with retry | `ErrorState`, retry refetches                                         | `common:error.generic`, `common:retry`            |

The sheet also draws: idle, name too long (inline error, Create disabled),
submitting (Create loading) and failed (inline `common:error.generic`, the sheet
stays open with the typed values).

## Data

| Route             | Paginated                              | Cache-Control       | Reasons listed                                                                            | Branches on                                                                                             |
| ----------------- | -------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /library`    | yes, cursor, through `useInfiniteList` | `private, no-cache` | `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_error`, `upstream_timeout` | none; all draw the generic error; `invalid_cursor` is handled by the paginated helper                   |
| `GET /profile/me` | no                                     | `private, no-cache` | `profile_not_found`                                                                       | none; feeds the own playlists' name                                                                     |
| `POST /playlists` | no                                     | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                   | none; all draw the generic error inline; `invalid_request` is prevented by the 1 to 200 character check |

The first page starts with the fixed entry (`id: "liked"`, `title: "liked"`, a
literal, so the row title comes from i18n). A next-page failure draws the
whole-body error, as on Home. Creating a playlist invalidates `library` and
`playlists/mine`. The mutation stays pending (the Create button keeps spinning) until both have refetched, so the sheet closes with the new row already drawn. The request sends the trimmed title, `is_public`, and
`description` only when it is not empty.

## Navigation

Route `/library`, the fourth tab. A saved album row (`kind: "album"`) pushes
`/album/[id]` with the entry's `id`, inside the Library tab's stack. A playlist
row whose `source` is `liked`, `user` or `genre` pushes `/playlist/[id]?source=` with the
entry's `id` and `source`; a playlist with another source is not pressable.

## i18n namespace

`library`, `common`.

## Checked by hand

- The row measures 64 with a 56 cover, the liked tile contrast, the last row
  clearing the floating tab bar.
- The keyboard not covering the sheet inputs on iOS and Android, the native
  switch colors on both platforms, the native glass on iOS 26+.
- Infinite scroll against the real API with more than 50 entries, and a created
  playlist reflected on Home after switching tabs.
