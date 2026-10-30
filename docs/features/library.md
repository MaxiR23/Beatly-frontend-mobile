# Library

The library tab: the fixed liked entry, the caller's own playlists and saved albums, playlists and artists, an all or artists filter, and the create-playlist sheet.

## Purpose

The user sees everything they keep in one list, newest first after the fixed
"Liked songs" entry, and creates a playlist from the header button. A saved
album row opens the album; the liked, own and saved genre playlist rows open the
playlist screen; a saved artist row opens the artist; a playlist with another source is not pressable. Two chips under the header, `library:filters.all` and `library:filters.artists`, switch between the whole library and only the saved artists, each its own list from the first page.

## Layout

- Header: `layout.gutter` horizontal and `spacing.sm` vertical padding, title
  in `typography.title`, at the end an `IconButton` (plus, `layout.controlHeight`
  square, `icon.size.lg`) and the `AccountButton`, `spacing.xs` apart.
- Rows: `MediaRow` size medium, cover `layout.rowCoverMedium` in `radius.sm`,
  `spacing.xs` vertical padding so the row is 64 high, `layout.gap` between
  cover and text, title in `typography.rowTitle`, meta in `typography.meta`
  with `color.text.secondary`. The list pads its end with
  `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).
- The liked entry draws a tile on `color.accent.primary` with a heart in
  `color.text.inverse`.
- Filter chips: a horizontal `ScrollView` of `Chip`s under the header, `layout.gutter` on the sides, `spacing.sm` apart and `spacing.md` above the list, the selected one filled (the shape of `AllReportsScreen`). Chips rather than a section: each filter is a server-side list from its first page with its own cursor, so no list is merged or filtered on the client, and it follows the precedent of `AllReportsScreen`.
- Artist rows: `MediaRow` with a round cover, `image` or the placeholder, meta `library:kind.artist` alone (the `subtitle` is null).
- Covers per `source`: `user` (own playlist) draws its `mosaic`; saved albums and
  playlists draw `image`, or the placeholder when it is null; rows at `small`
  (`DESIGN.md`, "Image tiers").
- Meta: `Playlist` alone for `liked`, never a name or "You"; `Playlist · <name>` for `user`, where the
  name is the profile's username or display name, and `Playlist` alone when
  there is none; otherwise `<Kind> · <subtitle>`
  when the API sends a `subtitle`, and `<Kind>` alone when it is null. The
  contract never ties a `source` to an owner name, so "Beatly" appears only if
  the API sends it as the subtitle.
- Sheet: `Sheet` on iOS on `GlassSurface`, `spacing.lg` gap, two `Input`s, a
  `SwitchRow` (track and thumb from `color.accent.primary` /
  `color.text.inverse` on, `color.surface.border` / `color.text.primary` off; on Android the Material 3
  switch, DESIGN.md, Switch) and two field-shaped buttons side by side with `spacing.md` gap.

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
| Artists empty    | `EmptyState`, no retry (`items: []`)                                  | `library:emptyArtists`                            |

The sheet also draws: idle, name too long (inline error, Create disabled),
submitting (Create loading) and failed (inline `common:error.generic`, the sheet
stays open with the typed values).

## Data

| Route                      | Paginated                                                                | Cache-Control       | Reasons listed                                                                            | Branches on                                                                                             |
| -------------------------- | ------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /library`             | yes, cursor, through `useInfiniteList`                                   | `private, no-cache` | `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_error`, `upstream_timeout` | none; all draw the generic error; `invalid_cursor` is handled by the paginated helper                   |
| `GET /library?kind=artist` | yes, cursor, through `useInfiniteList`, its own list from the first page | `private, no-cache` | as `GET /library`                                                                         | none; no liked entry; empty is `items: []`; `invalid_cursor` restarts keeping the kind                  |
| `GET /profile/me`          | no                                                                       | `private, no-cache` | `profile_not_found`                                                                       | none; feeds the own playlists' name                                                                     |
| `POST /playlists`          | no                                                                       | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                   | none; all draw the generic error inline; `invalid_request` is prevented by the 1 to 200 character check |

The first page starts with the fixed entry (`id: "liked"`, `title: "liked"`, a
literal, so the row title comes from i18n). A next-page failure draws the
whole-body error, as on Home. Creating a playlist invalidates `library` and
`playlists/mine`. The mutation stays pending (the Create button keeps spinning) until both have refetched, so the sheet closes with the new row already drawn. The request sends the trimmed title, `is_public`, and
`description` only when it is not empty.

Saved artists come from the star of the artist screen; saved albums and genre playlists come from the save button of the album and playlist
screens (`POST /library`, `DELETE /library/{kind}/{external_id}`). A save or a remove
invalidates `library` and the saved states under it, so the row appears or disappears on the next
library render.

## Navigation

Route `/library`, the fourth tab. A saved artist row (`kind: "artist"`) pushes `/artist/[id]` with the entry's `id`. A saved album row (`kind: "album"`) pushes
`/album/[id]` with the entry's `id`, inside the Library tab's stack. A playlist
row whose `source` is `liked`, `user` or `genre` pushes `/playlist/[id]?source=` with the
entry's `id` and `source`; a playlist with another source is not pressable.

## i18n namespace

`library`, `common`.

## Checked by hand

- The row measures 64 with a 56 cover, the liked tile contrast, the last row
  clearing the floating tab bar.
- The keyboard not covering the sheet inputs on iOS and Android, the native
  switch colors on iOS, the native glass on iOS 26+.
- Infinite scroll against the real API with more than 50 entries, and a created
  playlist reflected on Home after switching tabs.

## The sheet on Android

On Android the `Sheet` is the Material 3 modal bottom sheet (ADR 027, `ui` `Sheet`): attached to the bottom and side edges on `color.surface.raised`, `radius.xl` top corners, a `layout.modalHandleZoneAndroid` handle zone with a `layout.modalHandleWidthAndroid` x `layout.handleHeight` handle in `color.overlay.handleAndroid`, `spacing.xl` side padding, and the content above the bottom inset. A drag down from the handle zone (the only drag zone, so a scrolling list keeps its own scroll) closes it past `motion.dragToClose.*` and springs back with `motion.spring` short of it; the scrim and the system back close it; under reduce motion it does not follow the finger. On iOS the sheet is glass attached to the bottom and side edges like the system sheet, `radius.xl` top corners, its background reaching the bottom edge and its content the window's bottom inset plus `spacing.xl` above it. It opens and closes like the system sheet on both platforms: the backdrop fades in and out in place while only the sheet slides up on open and down on close, and under reduce motion both appear and disappear at once. On both platforms the sheet and its backdrop cover the tab bar and the mini player, and the sheet reads the window's insets, not a native tab's. The create sheet is the sheet above with its form.

Left to verify by hand. On an Android phone: the sheet meeting the bottom and side edges and the content ending above the gesture bar, the drag feel and the spring back on a finger, the system back closing it, and the scroll of a long list next to the handle zone.

On Android the `Input`s are the Material 3 outlined text field (ADR 027, `ui` `Input`; see DESIGN.md, Text field): outline, label inside rising onto it on focus or with text, accent outline on focus, error color and the error under the field; iOS unchanged. Left to verify by hand on an Android phone: the label animation feel, the notch over the sheet surface, TalkBack reading the label once and announcing the error.

On Android the public `SwitchRow` is the Material 3 switch (ADR 027, `ui` `SwitchRow`; see DESIGN.md, Switch): a 52×32 track, outlined with a small thumb when off, accent-filled with a large thumb when on, sliding on the native driver and at once under reduce motion; iOS unchanged. Left to verify by hand on an Android phone: the look of the off outline on the sheet surface, the slide and pressed feel, TalkBack reading the label and the state.
