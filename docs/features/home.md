# Home

The first tab: the account avatar and sheet, the recently played shelf and the
caller's own playlists shelf, and the personalized recommendation sections.

## Purpose

Show what the user listened to lately, their playlists and what Beatly recommends, and reach the account
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
- Cover rule: own playlists draw their `mosaic` (4: a 2 x 2 mosaic, 1 to 3: the
  first, none: the placeholder) at `medium`; a recent draws its `metadata.image` at
  `medium`, or the placeholder. `GET /playlists` has no `image`.
- Section order: recently played, albums for you, seed section 1, recommended albums, seed section 2, your playlists, seed section 3, recommended artists.
- Album card (albums for you, recommended albums, and the albums of a seed section): square cover, title, and the album's artists joined with `album:artistSeparator` in `typography.meta` `color.text.secondary`. No reason on any card.
- Artist card (recommended artists, and the artists of a seed section): round photo, name and `Artist` (`home:kind.artist`), centered in the recommended list. No reason on any card.
- Seed section header: the seed's round photo at `layout.seedAvatar`, then the prefix by position (`typography.meta`, secondary) over the seed's name (`typography.section`), `layout.gap` apart. The reason lives only here. Items come in the returned order with `Artist`, or the album's artists, below them; artists are round and not centered.
- Account sheet: on iOS, on `GlassSurface` attached to the bottom and side edges, `radius.xl` top corners, `spacing.xl` padding.
- Bottom: the content clears the floating tab bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

The sheet is native glass on iOS 26+ and a solid `color.surface.raised` surface
elsewhere. The tab bar is described in `tabs.md`.

## States

The body reads recents and playlists together. The avatar and the account sheet
are drawn in every state, so log out is always reachable. A profile that is
loading or failed (any reason) draws the avatar without a name and own
playlists without a subtitle.

| State                  | What is drawn                                                                                                                                        | i18n keys                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading                | `LoadingState` while either list loads; once they are in, the recommendation slots draw `CarouselSkeleton` (only the first labelled) while they load | `common:loading`                                                                                                                                                                     |
| With data              | the non-empty sections; an empty one is hidden                                                                                                       | `home:recents`, `home:playlists`, `home:kind.*`, `home:meta`, `album:artistSeparator`, `home:albumsForYou`, `home:recommendedAlbums`, `home:recommendedArtists`, `home:seedPrefix.*` |
| Expected empty         | `EmptyState` when recents, playlists and all four recommendation lists are empty, no action                                                          | `home:empty`                                                                                                                                                                         |
| Recommendations failed | an inline `ErrorState` in place of the recommendation sections; recents and playlists stay; retry calls `POST /recommendations/generate` again       | `common:error.generic`, `common:retry`                                                                                                                                               |
| Error with retry       | `ErrorState` when either list failed, on the first load or on a next page of playlists; retry refetches the failed ones                              | `common:error.generic`, `common:retry`                                                                                                                                               |

The avatar and the sheet are `AccountButton`, shared with Explore. The sheet's
first row is the `AvatarRow`, always drawn: with the profile in the cache it shows the header avatar, `display_name` or `common:account.noName`, and `common:account.viewProfile`, labelled `common:account.profileRow`. With no profile yet (loading or failed), a skeleton circle and bar stand in for the avatar and the name, and the row is labelled `common:account.viewProfile`. Either way it opens `/profile` (`profile.md`). Below it the sheet
holds report a problem and My reports (`common:account.report`, `common:account.myReports`; `bug-reports.md`), and All reports for developers and admins (`common:account.allReports`; `bug-reports.md`), above the log out button (`common:account.logout`); a failed log out draws
`common:error.generic`. The avatar and sheet close use `common:account.open` and
`common:account.close`.

## Data

| Route                            | Paginated                                 | Cache-Control       | Reasons listed                                                                            | Branches on                                                                           |
| -------------------------------- | ----------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /playlists`                 | yes, cursor, through `useInfiniteList`    | `private, no-cache` | `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_error`, `upstream_timeout` | none; all draw the generic error; `invalid_cursor` is handled by the paginated helper |
| `GET /recents`                   | single page of at most 30, never a cursor | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                   | none; all draw the generic error                                                      |
| `POST /recommendations/generate` | no (fixed caps)                           | `private, no-cache` | `unauthorized`, `upstream_error`, `upstream_timeout`                                      | none; any failure is the inline error with retry                                      |
| `GET /profile/me`                | no                                        | `private, no-cache` | `profile_not_found`                                                                       | none; feeds the avatar and the own playlists' subtitle                                |

`POST /recommendations/generate` is called on every mount of the home (stale at once by `no-cache`); with a valid set that has sections the backend returns it without regenerating. The deprecated `artists` and `albums` are not read. An empty list and a missing seed section are not drawn.

Starting a list in an album, an artist or a playlist registers it with `POST /recents` and invalidates `recents`, so the shelf refetches and shows it first. The stored metadata: album title, its artists as subtitle, its cover; artist name, no subtitle, its image; playlist title, the owner's username or display name for an own playlist, `Beatly` for a genre playlist and none for liked, its first cover, and its `kind`. The Home draws a liked recent's title from i18n (`playlist:liked`) and ignores the stored one, so a language change is reflected.

Creating a playlist from the library invalidates `playlists/mine`, so the shelf
shows it the next time Home renders.

Both lists answer "nothing" with `ok: true` and `items: []`: an expected empty
state, never a retry. The `metadata` keys of a recent (`title`, `subtitle`,
`thumbnail_url`, `image`, and `kind` on a playlist recent) are optional and read leniently: a missing one, or a value
that is not a string (for `image`, not a valid set of tiers), is treated as absent and omits that line or draws the
placeholder cover. An absent or unknown `kind` on a playlist recent also reads as
absent: the card is not pressable. The contract gives `metadata` a fixed shape on write, but it is not
validated on read and older rows may lack `title`, so a non-string value must
not fail the page.

Playlists load with `useInfiniteList`. If fetching a next page fails, the query
goes into error and the whole body draws `ErrorState`, hiding the shelves already
on screen until retry. Accepted for this issue.

## Navigation

Route `/`, the first tab of `(tabs)`, reached after sign in. An album card in
recently played pushes `/album/[id]` with the entry's `entity_id`, inside the
Home tab's stack; a card of "Your playlists" pushes `/playlist/[id]?source=user`
with the playlist's `id`; a playlist recent pushes
`/playlist/[id]?source=<metadata.kind>` with its `entity_id`; a playlist recent
without a kind is not pressable; an artist recent pushes `/artist/[id]` with its `entity_id`. A recommended album, in any section, pushes `/album/[id]` and a recommended artist `/artist/[id]`. Log out from the sheet lands on `/login` through the session gate.

## i18n namespace

`home` and `common`.

## Checked by hand

Screenshots of the home with data and empty, on iOS and Android, are in the pull
request. The native glass of the sheet on iOS 26+ and the last card clearing the
tab bar are checked on a device, and so are the real generation latency with its skeletons, the seed header and the centered artist cards.

## The sheet on Android

On Android the `Sheet` is the Material 3 modal bottom sheet (ADR 027, `ui` `Sheet`): attached to the bottom and side edges on `color.surface.raised`, `radius.xl` top corners, a `layout.modalHandleZoneAndroid` handle zone with a `layout.modalHandleWidthAndroid` x `layout.handleHeight` handle in `color.overlay.handleAndroid`, `spacing.xl` side padding, and the content above the bottom inset. A drag down from the handle zone (the only drag zone, so a scrolling list keeps its own scroll) closes it past `motion.dragToClose.*` and springs back with `motion.spring` short of it; the scrim and the system back close it; under reduce motion it does not follow the finger. On iOS the sheet is glass attached to the bottom and side edges like the system sheet, `radius.xl` top corners, its background reaching the bottom edge and its content the window's bottom inset plus `spacing.xl` above it. It opens and closes like the system sheet on both platforms: the backdrop fades in and out in place while only the sheet slides up on open and down on close, and under reduce motion both appear and disappear at once. On both platforms the sheet and its backdrop cover the tab bar and the mini player, and the sheet reads the window's insets, not a native tab's. The account sheet's `ActionRow`s are `layout.actionRowHeightAndroid` tall, full width, with an `icon.size.actionRowAndroid` icon.

Left to verify by hand. On an Android phone: the sheet meeting the bottom and side edges and the content ending above the gesture bar, the drag feel and the spring back on a finger, the system back closing it, and the scroll of a long list next to the handle zone.
