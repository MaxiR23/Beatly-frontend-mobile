# Home

The first tab: the account avatar and sheet, the recently played shelf and the
caller's own playlists shelf.

## Purpose

Show what the user listened to lately and their playlists, and reach the account
sheet with log out from the avatar.

## Layout

- Header: `layout.gutter` on the sides, `spacing.sm` vertical, the avatar at the
  end. The avatar is `layout.avatar` square, `radius.full`, on an `avatarPalette`
  gradient chosen from the name; it draws the initials in `typography.rowTitle`,
  or a `user` icon when there is no name.
- Sections: `spacing.xl` apart, each with its title in `typography.section` on
  `layout.gutter`, then a horizontal carousel with `spacing.md` between cards,
  starting at `layout.gutter`.
- Card: `layout.carouselCard` wide. Cover `layout.carouselCard` square,
  `radius.sm`, or `radius.full` for an artist, on `color.surface.card`. Title in
  `typography.rowTitle`, one line; subtitle in `typography.meta` in
  `color.text.secondary`, one line. For an own playlist the subtitle is the
  profile name (username, or display name when username is null), and nothing
  when the profile has no name, is loading or failed. For a recent it is
  `Artist` for an artist, and `<Kind> · <metadata.subtitle>` or `<Kind>` alone
  for an album or playlist.
- Cover rule: with 4 `thumbnail_urls`, a 2 x 2 mosaic; with 1 to 3, the first
  entry; with none, the placeholder. `GET /playlists` has no `thumbnail_url`. A
  recent draws its `metadata.thumbnail_url`, or the placeholder.
- Account sheet: on `GlassSurface`, `radius.lg`, `spacing.xl` padding.
- Bottom: the content clears the floating tab bar with `floatingTabBarClearance`.

## Platform differences

The sheet is native glass on iOS 26+ and a solid `color.surface.raised` surface
elsewhere. The tab bar is described in `tabs.md`.

## States

The body reads recents and playlists together. The avatar and the account sheet
are drawn in every state, so log out is always reachable. A profile that is
loading or failed (any reason) draws the avatar without a name and own
playlists without a subtitle.

| State            | What is drawn                                                                                                           | i18n keys                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Loading          | `LoadingState` while either list loads                                                                                  | `common:loading`                                             |
| With data        | the non-empty sections; an empty one is hidden                                                                          | `home:recents`, `home:playlists`, `home:kind.*`, `home:meta` |
| Expected empty   | `EmptyState` when both lists have no items, no action                                                                   | `home:empty`                                                 |
| Error with retry | `ErrorState` when either list failed, on the first load or on a next page of playlists; retry refetches the failed ones | `common:error.generic`, `common:retry`                       |

The avatar and the sheet are `AccountButton`, shared with Explore. The sheet
holds the log out button (`common:account.logout`); a failed log out draws
`common:error.generic`. The avatar and sheet close use `common:account.open` and
`common:account.close`.

## Data

| Route             | Paginated                                 | Cache-Control       | Reasons listed                                                                            | Branches on                                                                           |
| ----------------- | ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /playlists`  | yes, cursor, through `useInfiniteList`    | `private, no-cache` | `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_error`, `upstream_timeout` | none; all draw the generic error; `invalid_cursor` is handled by the paginated helper |
| `GET /recents`    | single page of at most 30, never a cursor | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                   | none; all draw the generic error                                                      |
| `GET /profile/me` | no                                        | `private, no-cache` | `profile_not_found`                                                                       | none; feeds the avatar and the own playlists' subtitle                                |

Creating a playlist from the library invalidates `playlists/mine`, so the shelf
shows it the next time Home renders.

Both lists answer "nothing" with `ok: true` and `items: []`: an expected empty
state, never a retry. The `metadata` keys of a recent (`title`, `subtitle`,
`thumbnail_url`) are optional and read leniently: a missing one, or a value
that is not a string, is treated as absent and omits that line or draws the
placeholder cover. The contract gives `metadata` a fixed shape on write, but it is not
validated on read and older rows may lack `title`, so a non-string value must
not fail the page.

Playlists load with `useInfiniteList`. If fetching a next page fails, the query
goes into error and the whole body draws `ErrorState`, hiding the shelves already
on screen until retry. Accepted for this issue.

## Navigation

Route `/`, the first tab of `(tabs)`, reached after sign in. An album card in
recently played pushes `/album/[id]` with the entry's `entity_id`, inside the
Home tab's stack; artist and playlist cards and the playlist carousel are not
pressable yet. Log out from the sheet lands on `/login` through the session gate.

## i18n namespace

`home` and `common`.

## Checked by hand

Screenshots of the home with data and empty, on iOS and Android, are in the pull
request. The native glass of the sheet on iOS 26+ and the last card clearing the
tab bar are checked on a device.
