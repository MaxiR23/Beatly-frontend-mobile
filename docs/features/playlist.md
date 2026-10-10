# Playlist

An own, the liked or a genre playlist, on the detail screen base.

## Purpose

Show a playlist: its cover, title, creator, description, meta line and tracks.
There are three kinds, chosen by the `source` param of the route: `user` (an own
playlist), `liked` (the liked songs) and `genre` (a curated playlist). Own and liked
tracks load with infinite scroll; a genre playlist loads whole with its header, in one request. Pressing a track plays the loaded tracks from it, with the playlist as the
source (`player.md`). Every track ends with a more button that opens the track menu (`track-menu.md`); in an own playlist the menu also offers Remove from this playlist, which refreshes the header and the tracks, and the liked and genre playlists never offer it. A row under the header plays the whole playlist from its first track with shuffle off, or shuffled from a random track with shuffle on, and registers the recent like a track press; own and liked load every remaining page first, with the pressed button busy. A genre playlist can also be saved to the library; own and liked never can. An own playlist's options button edits its title and description, opens an edit mode to reorder and remove its tracks, or deletes it; sharing is a later issue.

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
- Action row: `DetailActions` (`DESIGN.md`, "Detail screen base") between the info and the
  tracks, `spacing.xl` below it (the info ends with the same gap): play and shuffle always,
  both disabled when the loaded list is empty (playlist tracks are always playable); save only
  on a genre playlist, disabled while its state loads or when reading it failed. While play or
  shuffle loads the remaining pages of an own or liked playlist, the pressed button is busy and
  both are disabled. On an own and a genre playlist the row is a centered group, `layout.actionGap` apart: shuffle, play
  (`PlayButton`), and a side button, `layout.controlHeight` like shuffle: save on a genre playlist, or
  the options button on an own playlist (an `IconButton` `ellipsis` opening a `Sheet` of `ActionRow`s
  on both platforms) with Edit details (`pencil`), Edit tracks (`gripVertical`) and Delete playlist (`trash`, destructive); never
  on liked, genre or albums; no share or search button yet. The options open the sheet on iOS too,
  unlike the track menu's system menu (ADR 023): the iOS menu is anchored to the button, and a
  playlist-wide action reads better as a sheet from the bottom. When the pill shrinks the group stays
  centered, so shuffle and the side button follow it toward the center. On the liked playlist the row
  is two `Button` pills of the same width filling the row between the gutters, `layout.controlHeight`
  tall and `layout.gap` apart: play (`primary`, glyph and `playlist:play`) and shuffle (`secondary`,
  glyph and `playlist:shuffle`).
- Edit sheet: the `CreatePlaylistSheet` layout (`spacing.lg` form gap, two `field` buttons `spacing.md`
  apart) with the name and the description prefilled and no public switch. Save is disabled while
  nothing changed or the title is empty or over 200 characters, and sends only the changed fields.
- Delete: the native `Alert` (destructive Delete and Cancel) asks first. A failed delete shows the
  floating error `Notice` (`layout.gutter` sides, `spacing.md` above the tab bar clearance, shown for
  `motion.duration.notice`; each failure restarts the timer).
- Edit tracks (`EditTracksScreen`, route `/playlist-edit/[id]`): a header in a `SafeAreaView` (top edge)
  with a back `IconButton` (`chevronLeft`, `playlist:back`), the title (`typography.title`) and a ghost
  Done button, `layout.gutter` on the sides and `spacing.sm` between. It loads every page of the tracks
  first (the same `loadAll` that play uses, waiting for the refetch of the cached pages to end so the
  edit starts from the server's order) and draws the loading state meanwhile. Then the list, on a
  `color.surface.base` screen that clears the tab bar with `useTabBarClearance`:
  - iOS with the ExpoUI module (`NativeEditList`, ADR 025): a SwiftUI `List` in edit mode, plain style;
    the system draws the drag handles, the minus button and the swipe to delete. Rows are text only,
    the title over the artists, without a cover: `@expo/ui`'s `Image` cannot draw a remote URL.
  - Android, Expo Go and an iOS build without the module (`ReorderList`): rows
    `layout.controlHeight + 2 * spacing.xs` tall with a remove button (`x`) at the start, the cover,
    title and artists, and a drag handle (`gripVertical`) at the end. Holding the handle lifts the row
    (`color.surface.raised`, `shadow.floating`) while it follows the finger; the other rows make room
    over `motion.duration.fast` (at once under reduce motion); the list does not scroll while a row is
    held and auto-scrolls inside `motion.reorder.edge` of either end at `motion.reorder.speed`.
    Each row is one accessible element announcing its position, with Move up and Move down actions
    (none past the ends).
    Every gesture redraws the list at once and goes to core's `createTrackEditor`, which sends the
    requests one at a time in the order they were made. A failed request shows the floating error notice
    (placed like the delete's), drops the edits queued behind it, and once the queue settles reloads the
    tracks from the server, so the list draws the server's order. Done is busy until the queue is empty
    and then goes back; back (button, swipe, hardware) leaves at once and the queue finishes on its own.
    Leaving, once the queue has settled and only if something was sent, refreshes the header, the
    tracks, `library`, `playlists/mine` and the membership of each removed track. Playback is never
    touched: when the edited playlist is the playback source the queue keeps playing in the old order.
- Play button: idle (the playlist is not the playback source) it is a pill with the play glyph and
  `playlist:play`; pressing it plays the whole list from the first track, after loading every page of
  an own or liked playlist (the pressed button shows the spinner meanwhile). Pressing it, the label
  fades out (`motion.playButton.labelFade`), then the `layout.playButtonPill` pill, holding the play
  glyph, shrinks to the circle (`motion.playButton.shrink`, ease in-out), even when the start is
  instant; only then does it draw the spinner, or the pause glyph, scaling in over
  `motion.playButton.scaleIn`, if playback already started. While the stream loads it is a circle with a spinner (a
  mid-track buffer shows it too); playing it is a circle with the pause
  glyph, labelled `playlist:pause`, and pressing it pauses; paused it shows the play glyph and pressing
  it resumes. Once the list has ended (paused on its last track) pressing it restarts the list from position 0 of the current play order: the first track with shuffle off, the first of the shuffled order with shuffle on. Under reduce motion neither the fade, the shrink nor the scale-in animate.
  On the liked playlist the play pill never shrinks: it shows Play, the spinner while the pages and the stream load, the pause glyph with `playlist:pause` while the list plays, and Play again when paused.
- The row of every occurrence of the current track (whoever started it) draws the now playing bars
  over its cover on a scrim, with no row background, and is announced as selected; the bars are frozen
  while paused and static under reduce motion.
- Tracks: one `MediaRow` `regular` per track (`layout.rowCover` cover), in API order.
  The bottom clears the floating tab bar with `useTabBarClearance` (the bar's clearance, plus the mini player's when a track is loaded).

## Platform differences

- iOS: the floating buttons use native glass on iOS 26+, `GlassSurface`'s solid
  fallback elsewhere.
- Android: the solid fallback draws the buttons.
- Expo Go: the native color module is missing, so the wash stays neutral.
- Edit tracks: iOS with the `ExpoUI` module draws `NativeEditList` (the system list); Android, Expo Go
  and an iOS build without the module draw `ReorderList`.

## States

The floating back button is drawn in every state.

| State                         | What is drawn                                                                                                 | i18n keys                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                       | `DetailSkeleton`, static, while the header or the tracks load                                                 | `common:loading`                                                                                                                                                                                                                                                 |
| With data                     | the hero, title, info and tracks; the song count with plural forms                                            | `playlist:liked`, `playlist:private`, `playlist:public`, `playlist:songs`, `playlist:durationMinutes`, `playlist:durationHours`, `common:brand`, `playlist:play`, `playlist:shuffle`, `playlist:save`, `playlist:unsave`, `playlist:pause`, `playlist:options.*` |
| Expected empty                | `EmptyState` under the header when there are no tracks                                                        | `playlist:empty`                                                                                                                                                                                                                                                 |
| Error with retry              | `ErrorState`; retry refetches only the query that failed                                                      | `common:error.generic`, `common:retry`                                                                                                                                                                                                                           |
| Not found                     | `EmptyState` with no action, for `playlist_not_found` on either query                                         | `playlist:notFound`                                                                                                                                                                                                                                              |
| Edit sheet                    | idle, invalid title with the inline message, busy save, failed save with the generic error and the input kept | `playlist:edit.*`, `common:error.generic`                                                                                                                                                                                                                        |
| Delete                        | the native confirmation; a failed delete draws the floating error notice and stays                            | `playlist:delete.*`, `common:error.generic`                                                                                                                                                                                                                      |
| Edit tracks: loading          | `LoadingState` until every page has loaded (also while the server order reloads after a failed edit)          | `common:loading`                                                                                                                                                                                                                                                 |
| Edit tracks: with data        | the list with a handle and a remove control per row, the header with Done                                     | `playlist:editTracks.*`, `playlist:artistSeparator`                                                                                                                                                                                                              |
| Edit tracks: expected empty   | `EmptyState` `music`                                                                                          | `playlist:empty`                                                                                                                                                                                                                                                 |
| Edit tracks: error with retry | `ErrorState` when a page fails; retry refetches and loads the rest                                            | `common:error.generic`, `common:retry`                                                                                                                                                                                                                           |
| Edit tracks: not found        | `EmptyState` with no action, for `playlist_not_found`                                                         | `playlist:notFound`                                                                                                                                                                                                                                              |
| Edit tracks: failed edit      | the floating error notice, then the server order reloaded                                                     | `common:error.generic`                                                                                                                                                                                                                                           |

The back button is labeled `playlist:back`.

## Data

| Route                                      | Paginated   | Cache-Control       | Reasons listed                                                                                                               | Branches on                                                                       |
| ------------------------------------------ | ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /playlists/{id}`                      | no          | `private, no-cache` | `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_*`                                                        | `playlist_not_found`                                                              |
| `GET /playlists/{id}/tracks`               | yes, cursor | `private, no-cache` | `playlist_not_found`, `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_*`                                      | `playlist_not_found`                                                              |
| `GET /playlists/liked`                     | no          | `private, no-cache` | `unauthorized`, `upstream_*`                                                                                                 | none (generic error)                                                              |
| `GET /playlists/liked/tracks`              | yes, cursor | `private, no-cache` | `invalid_request`, `invalid_cursor`, `unauthorized`, `upstream_*`                                                            | none; `invalid_cursor` by the helper                                              |
| `GET /public/genre-playlists/{id}`         | no          | `no-store`          | `playlist_not_found`, `invalid_request`, `upstream_*`                                                                        | `playlist_not_found`                                                              |
| `GET /library/{kind}/{external_id}`        | no          | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                                                      | none; a failure leaves save disabled (genre only)                                 |
| `POST /library`                            | no          | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                                                      | none; a failure rolls the save button back                                        |
| `DELETE /library/{kind}/{external_id}`     | no          | `private, no-cache` | `library_item_not_found`, `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                            | `library_item_not_found` leaves it not saved; anything else rolls the button back |
| `PATCH /playlists/{id}`                    | no          | `private, no-cache` | `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                                | none; every failure is the generic error inline in the sheet                      |
| `DELETE /playlists/{id}`                   | no          | `private, no-cache` | `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                                | `playlist_not_found` counts as deleted; anything else is the floating error       |
| `POST /playlists/{id}/move-track`          | no          | `private, no-cache` | `order_key_conflict`, `playlist_not_found`, `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`          | none; every failure is the floating error notice and a reload                     |
| `DELETE /playlists/{id}/tracks/{track_id}` | no          | `private, no-cache` | `playlist_not_found`, `invalid_request` (a malformed playlist id only), `unauthorized`, `upstream_error`, `upstream_timeout` | none; every failure is the floating error notice and a reload                     |
| `POST /recents`                            | no          | `private, no-cache` | `invalid_request`, `unauthorized`, `upstream_error`, `upstream_timeout`                                                      | none; a failure is logged and nothing is drawn                                    |

`GET /public/genre-playlists/{id}` carries the header and the tracks of a genre
playlist, so the paged tracks query never runs for it.

Play and shuffle of an own or liked playlist fetch every remaining page of `tracks` through the shared infinite-query hook (`loadAll`) before starting, so the queue holds the whole list in the API's order; a failed page puts the query in error and draws the whole-body error, and the start does not happen. Leaving the screen while the pages load cancels the start: nothing plays. A genre playlist already has every track. `GET /playlists/{id}/track-ids` is not used. Play sets shuffle off and shuffle sets it on before starting; a row press leaves the flag as it is.

Save (genre only, never on own or liked) sends `{ kind: "playlist", source: "genre", external_id, title }` with `thumbnail_url` (the first cover url) when there is one, and no `artist`. The button flips at once and rolls back if the write fails.

Edit sends only the changed fields (an emptied description as `null`) and refreshes the header, `library`, `playlists/mine` and `recents`. Delete counts `playlist_not_found` as deleted, goes back and refreshes `library`, `playlists/mine` and `recents`. Delete is confirmed with React Native's `Alert.alert`, not a `packages/ui` component, so its look is the OS's and not the tokens'. Delete does not refresh the deleted playlist's own queries (header and tracks), so the screen does not flash the unavailable state before it goes back. Neither registers a recent. A saved edit renames the playback source when this playlist is playing, so the player's "playing from" shows the new title; the queue and the track are kept. `useUpdatePlaylist` is the first query hook that writes to playback (`playback.renameSource`, in its `onSuccess`): the rename has to land with the confirmed title of the PATCH response, the same moment the queries refresh, and the playback controller only changes `source.name` when that playlist is the current source. A delete never touches playback, so a deleted playlist that is the playback source keeps playing its queue under its old name.

Edit tracks sends `POST /playlists/{id}/move-track` with `{ old_position, new_position }`, both 1-based positions in the fully loaded list (`index + 1`; `new_position` is the track's final position), and `DELETE /playlists/{id}/tracks/{track_id}` for a removal. The requests go one at a time, in the order the gestures were made, because every position is computed against the order the previous request left; after the first failure the edits queued behind it are dropped, since their positions would refer to an order the server never reached, and the tracks are reloaded. The sequencing is a `core` service (`createTrackEditor`) and not TanStack's mutation `scope`, which also serializes but cannot drop the mutations queued behind a failure, so it would send positions computed against an order the server never reached; the one precedent of a chained-request service (`createPlaylistWithTrack`) is in `core` too. The reload resets the tracks query that `PlaylistScreen` behind the edit mode also reads, so after a failed edit that screen returns to its first page and refetches; its `loadMore` keeps working. Leaving refreshes the header (count, duration, mosaic), the tracks, `library`, `playlists/mine` and the membership of the removed tracks. Playback is never touched. Home's playlist recents keep the cover they were registered with: a reorder that changes the first cover does not change that recent's image.

Home's recents follow both: a rename updates the title of the playlist's recents and a delete removes them, on the backend (`PATCH` and `DELETE /playlists/{id}` in `docs/api/playlists.md`), and the `recents` refresh after each makes Home show it without reopening the app.

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

Edit tracks opens from the options sheet of an own playlist, at `/playlist-edit/[id]`, one file in the shared tab stack (ADR 020), in the current tab. Back, the swipe and the hardware button leave at once; Done waits for the queue.

## i18n namespace

`playlist` and `common`.

## Checked by hand

The SwiftUI list in edit mode on iOS: its look in the dark theme, the system handles, the swipe and minus delete, and the move landing where the row was dropped; the Android drag on a device: the lifted row following the finger, the others making room, no scroll while held, auto-scroll near both edges on a playlist of more than 50 tracks (and a few hundred), and the values of `motion.reorder.edge` and `motion.reorder.speed`; that the order and the removals persist after closing and reopening, and Home and Library updating; VoiceOver and TalkBack announcing the position and the move action; editing the playing playlist; the `ReorderList` fallback on iOS in Expo Go; the options sheet on iOS and Android; the native confirmation on both platforms; a rename and a delete seen in Home and Library without reopening the app; deleting the playing playlist; screenshots of the three kinds on iOS and Android; the label fade, then the eased shrink with shuffle and the side button following toward the center, on an own, a genre playlist and an album (instant start) and a long own playlist, before the spinner or pause; the liked playlist's two pills filling the row and the play pill's Play, spinner and Pause; a rename of the playing playlist shown as the player's source; the play pill shrinking to a circle and scaling in as pause, the now playing bars moving, freezing on pause and static under reduce motion; play and shuffle on a real own or liked playlist of more than 50 tracks; saving a genre playlist and finding it in the library; infinite scroll with a real
gesture on a playlist of more than 50 tracks; real covers on an own playlist header; a playlist recent of each kind opening from
Home; real covers, the dominant-color wash
and the brand mark at `layout.creatorMark`; swipe-back per tab and the native tab
bar on iOS 26+; and the album screen scrolled to its carousels after its list moved
to a `FlatList`.
