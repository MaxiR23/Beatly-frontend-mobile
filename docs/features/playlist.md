# Playlist

An own, the liked or a genre playlist, on the detail screen base.

## Purpose

Show a playlist: its cover, title, creator, description, meta line and tracks.
There are three kinds, chosen by the `source` param of the route: `user` (an own
playlist), `liked` (the liked songs) and `genre` (a curated playlist). Own and liked
tracks load with infinite scroll; a genre playlist loads whole with its header, in one request. Pressing a track plays the loaded tracks from it, with the playlist as the
source (`player.md`). Every track ends with a more button that opens the track menu (`track-menu.md`); in an own playlist the menu also offers Remove from this playlist, which refreshes the header and the tracks, and the liked and genre playlists never offer it. Editing and sharing are later issues.

## Layout

Everything is drawn by `DetailScreen` (`DESIGN.md`, "Detail screen base"), except
the info block:

- Hero: the cover in `layout.heroCover`, `radius.sm`, `shadow.cover`, over the wash
  from the dominant color (neutral for liked). Own: the mosaic of its
  `thumbnail_urls`, the single image with one, the placeholder with none. Liked: the accent tile with the heart. Genre:
  the mosaic of its thumbnails, the single thumbnail with none.
- Info: `layout.gutter` on the sides, `spacing.xs` gap, `spacing.xl` below.
  - Creator row, `spacing.sm` gap: a `layout.creatorMark` mark (the user's avatar for
    an own playlist, the brand mark on `color.accent.primary` in `radius.full` for a
    genre playlist) and the name in `typography.rowTitle` and `color.text.secondary`.
    Liked has none; an own playlist has none when the profile fails.
  - Description in `typography.body` and `color.text.secondary`, when there is one.
  - Meta line in `typography.meta` and `color.text.tertiary`: Private or Public (own
    only), the song count and the duration in hours and minutes.
- Tracks: one `MediaRow` `regular` per track (`layout.rowCover` cover), in API order.
  The bottom clears the floating tab bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

- iOS: the floating buttons use native glass on iOS 26+, `GlassSurface`'s solid
  fallback elsewhere.
- Android: the solid fallback draws the buttons.
- Expo Go: the native color module is missing, so the wash stays neutral.

## States

The floating back button is drawn in every state.

| State            | What is drawn                                                         | i18n keys                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading          | `DetailSkeleton`, static, while the header or the tracks load         | `common:loading`                                                                                                                                |
| With data        | the hero, title, info and tracks; the song count with plural forms    | `playlist:liked`, `playlist:private`, `playlist:public`, `playlist:songs`, `playlist:durationMinutes`, `playlist:durationHours`, `common:brand` |
| Expected empty   | `EmptyState` under the header when there are no tracks                | `playlist:empty`                                                                                                                                |
| Error with retry | `ErrorState`; retry refetches only the query that failed              | `common:error.generic`, `common:retry`                                                                                                          |
| Not found        | `EmptyState` with no action, for `playlist_not_found` on either query | `playlist:notFound`                                                                                                                             |

The back button is labeled `playlist:back`.

## Data

| Route                              | Paginated   | Cache-Control       | Reasons listed                                                                          | Branches on                                    |
| ---------------------------------- | ----------- | ------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `GET /playlists/{id}`              | no          | `private, no-cache` | `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_*`                   | `playlist_not_found`                           |
| `GET /playlists/{id}/tracks`       | yes, cursor | `private, no-cache` | `playlist_not_found`, `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_*` | `playlist_not_found`                           |
| `GET /playlists/liked`             | no          | `private, no-cache` | `unauthorized`, `upstream_*`                                                            | none (generic error)                           |
| `GET /playlists/liked/tracks`      | yes, cursor | `private, no-cache` | `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_*`                       | none; `invalid_cursor` by the helper           |
| `GET /public/genre-playlists/{id}` | no          | `no-store`          | `playlist_not_found`, `invalid_request`, `upstream_*`                                   | `playlist_not_found`                           |
| `POST /recents`                    | no          | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                 | none; a failure is logged and nothing is drawn |

`GET /public/genre-playlists/{id}` carries the header and the tracks of a genre
playlist, so the paged tracks query never runs for it.

Starting a list from a track registers the playlist with `POST /recents`, and a failure never stops the music.

A failed later tracks page replaces the whole screen with the error and retry, as
Home and Library do; it does not keep the loaded tracks with an inline error.

Each track row is keyed `track_id:position`, because the same track can appear
more than once in a playlist. If the playlist is edited while it is being paged,
positions can shift between pages and two rows can end up with the same key. That
collision is accepted: the paging cursor is the backend's, and the client does not
dedupe or re-sort across pages.

Every one is stale at once, so each query refetches on mount. The liked title comes
back as an identifier, so the screen draws `playlist:liked` instead. A saved genre
playlist whose id is not a genre playlist draws the generic error.

A detail without `thumbnail_urls` draws the generic error on purpose: the field is
required, so a backend regression surfaces as a schema failure rather than a
placeholder cover.

## Navigation

Route `/playlist/[id]?source=`, declared once in the shared stack of the four tabs
(ADR 020). It opens from Home "Your playlists" (`user`), Library rows (`liked`,
`user`, `genre`, as the entry's `source`) and the genre grid (`genre`), always inside
the current tab, and from Home playlist recents (`source` from the recent's
`metadata.kind`; the liked recent's id is `liked`); a playlist recent without a kind
is not pressable. A missing or unknown `source` reads as `user`. Back pops the stack,
or replaces with `/` when there is nothing to go back to.

## i18n namespace

`playlist` and `common`.

## Checked by hand

Screenshots of the three kinds on iOS and Android; infinite scroll with a real
gesture on a playlist of more than 50 tracks; real covers on an own playlist header; a playlist recent of each kind opening from
Home; real covers, the dominant-color wash
and the brand mark at `layout.creatorMark`; swipe-back per tab and the native tab
bar on iOS 26+; and the album screen scrolled to its carousels after its list moved
to a `FlatList`.
