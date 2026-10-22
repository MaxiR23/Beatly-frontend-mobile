# Design tokens

Every visual value in the app comes from `packages/ui/src/tokens/`, one
file per domain, re-exported from `packages/ui`'s entry point. A screen
or a component names a token by its role; it never writes a hex, a
size, a spacing, a radius or a font value itself. See
[`docs/adr/008-design-tokens-and-single-dark-theme.md`](docs/adr/008-design-tokens-and-single-dark-theme.md)
for why.

This file maps every role to its token, by name. It never repeats a
value: the value lives once, in the token file.

## Color (`color`)

| Role                                                                                                                                                             | Token                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Base background of every screen and the detail top bar without a dominant color (on iOS the strip's wash without one, and its shade)                             | `color.surface.base`                                                                         |
| Sheet, modal, dialog and form `Card` background (the `ui` `Card` is only this raised card; a list card is a different component)                                 | `color.surface.raised`                                                                       |
| List card, input and image-placeholder background                                                                                                                | `color.surface.card`                                                                         |
| Secondary control background (secondary button, inactive chip/tab)                                                                                               | `color.surface.control`                                                                      |
| Card/sheet/input border, divider, skeleton base                                                                                                                  | `color.surface.border`                                                                       |
| Primary text                                                                                                                                                     | `color.text.primary`                                                                         |
| Secondary text (subtitles, artist names, descriptions)                                                                                                           | `color.text.secondary`                                                                       |
| Tertiary text (meta, captions)                                                                                                                                   | `color.text.tertiary`                                                                        |
| Disabled text                                                                                                                                                    | `color.text.disabled`                                                                        |
| Text drawn on a light/accent background                                                                                                                          | `color.text.inverse`                                                                         |
| The app's single accent (primary buttons, active state)                                                                                                          | `color.accent.primary`                                                                       |
| Switch: track and thumb when on, track and thumb when off                                                                                                        | `color.accent.primary` / `color.text.inverse`, `color.surface.border` / `color.text.primary` |
| Destructive/error state                                                                                                                                          | `color.status.error`                                                                         |
| Success/confirmation state                                                                                                                                       | `color.status.success`                                                                       |
| Sheet/modal backdrop                                                                                                                                             | `color.overlay.backdrop`                                                                     |
| Scrim over an image (behind a control or text; the now playing scrim over a row cover)                                                                           | `color.overlay.onImage`                                                                      |
| Subtle translucent fill (ghost button, translucent chip)                                                                                                         | `color.overlay.subtle`                                                                       |
| Muted translucent fill (seek track, icon-button background)                                                                                                      | `color.overlay.muted`                                                                        |
| Sheet handle bar on Android                                                                                                                                      | `color.overlay.handleAndroid`                                                                |
| Clear start of a fade into the base surface (the detail hero image); the see-through container of the player route                                               | `color.overlay.clear`                                                                        |
| Opacity stops of the iOS detail strip: its wash (the dominant color or the base surface) and the base-surface shade over it, both transparent at the bottom edge | `color.gradient.detailStrip.wash` / `.shade`                                                 |
| Opacity stops of the mask of the iOS detail strip's blur: opaque to 55% of the strip's height, transparent at its bottom edge                                    | `color.gradient.detailStrip.blurMask`                                                        |

## Spacing and layout (`spacing`, `layout`)

| Role                                                                                                                                                                         | Token                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Spacing scale, multiples of four                                                                                                                                             | `spacing.xxs` … `spacing.xxl`                                   |
| Screen edge padding                                                                                                                                                          | `layout.gutter`                                                 |
| Gap between items in a list/row                                                                                                                                              | `layout.gap`                                                    |
| Minimum touch target padding (`hitSlop`)                                                                                                                                     | `layout.hitSlop`                                                |
| Height of a form control (input, form button) or a floating tab bar item, the height of the player header row, the detail top bar's row, and side of its square touch target | `layout.controlHeight`                                          |
| Minimum height of a multiline form field                                                                                                                                     | `layout.textAreaHeight`                                         |
| Width of a carousel card and side of its cover                                                                                                                               | `layout.carouselCard`                                           |
| Side of the header account avatar                                                                                                                                            | `layout.avatar`                                                 |
| Side of the leading mark (avatar or brand mark) in a detail creator line                                                                                                     | `layout.creatorMark`                                            |
| Side of the large avatar of the profile screen                                                                                                                               | `layout.profileAvatar`                                          |
| Height of a filter chip and of a segmented control option                                                                                                                    | `layout.chipHeight`                                             |
| Width / height of the genre accent bar in a genre row                                                                                                                        | `layout.genreBarWidth` / `layout.genreBarHeight`                |
| Side of the cover in a list row and in the mini player                                                                                                                       | `layout.rowCover`                                               |
| Side of the cover in the medium list row (library) and the song row of the player sheet                                                                                      | `layout.rowCoverMedium`                                         |
| Side of the cover in the large list row (search top artist)                                                                                                                  | `layout.rowCoverLarge`                                          |
| Side of the cover in a detail hero                                                                                                                                           | `layout.heroCover`                                              |
| Width / height ratio of the full-width detail hero image                                                                                                                     | `layout.heroImageRatio`                                         |
| Share of the window height the detail hero image may take at most                                                                                                            | `layout.heroImageMaxHeightShare`                                |
| Width of the track-number column in a track row                                                                                                                              | `layout.trackNumber`                                            |
| Width of one bar of the now playing indicator                                                                                                                                | `layout.nowPlayingBarWidth`                                     |
| Side of the large play or pause button of the player                                                                                                                         | `layout.playButton`                                             |
| Side of the detail play button's circle and height of its idle pill                                                                                                          | `layout.playButtonMedium`                                       |
| Width of the detail play button's idle pill                                                                                                                                  | `layout.playButtonPill`                                         |
| Stacking value of the detail action row's side buttons, above the play slot                                                                                                  | `layout.sideButtonStack`                                        |
| Height of the seek bar track / side of its thumb                                                                                                                             | `layout.seekTrack` / `layout.seekThumb`                         |
| Width / height of the sheet handle bar                                                                                                                                       | `layout.handleWidth` / `layout.handleHeight`                    |
| Width / height of the sheet handle bar on Android                                                                                                                            | `layout.handleWidthAndroid` / `layout.handleHeightAndroid`      |
| Width of a skeleton placeholder bar (title, meta, row title, row meta), as a share of its row                                                                                | `layout.skeletonBar.title` / `.meta` / `.rowTitle` / `.rowMeta` |
| Placeholder track rows of a detail skeleton (first load, next-page footer)                                                                                                   | `layout.skeletonRows`                                           |

## Image tiers

Every remote image is one of the three tiers the API sends (`image`, `mosaic`). The tier is the smallest whose side covers the drawn side at 3 pixels per point: `small` up to 64 pt, `medium` up to 200 pt, `large` above. `Cover` and the detail image hero apply it from the side they draw (`packages/ui/src/components/imageTier.ts`); a screen never picks a tier and never builds or edits a URL. With no image (`image: null`, `mosaic: []`) the cover draws the placeholder. The dominant color reads `small`.

| Place                                                                                | Drawn side                                   | Tier                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| Row cover (songs, up next, related, edit list, track menu sheet) and the mini player | `layout.rowCover`                            | `small`                                   |
| Medium row (library, playlist picker) and the player sheet's song row                | `layout.rowCoverMedium`                      | `small`                                   |
| Large row (search top artist)                                                        | `layout.rowCoverLarge`                       | `small`                                   |
| Mosaic cell of any row                                                               | half the row cover                           | `small`                                   |
| Carousel card                                                                        | `layout.carouselCard`                        | `medium`                                  |
| Mosaic cell of a carousel card                                                       | half `layout.carouselCard`                   | `medium`                                  |
| Grid card (genre)                                                                    | `gridCardSize(window width)`                 | `medium` on a phone, `large` above 200 pt |
| Mosaic cell of the detail hero cover                                                 | half `layout.heroCover`                      | `medium`                                  |
| Detail hero cover (album, playlist)                                                  | `layout.heroCover`                           | `large`                                   |
| Player cover                                                                         | window width minus `spacing.xl` on each side | `large`                                   |
| Detail image hero (artist photo)                                                     | window width                                 | `large`                                   |
| Dominant color (player, mini player, album and playlist washes)                      | n/a                                          | `small`                                   |

## Floating surfaces

`GlassSurface` from `@beatly/ui/native`, the only importer of
`expo-glass-effect`: native glass on iOS 26+, elsewhere
`color.surface.raised` with a `border.width` border in
`color.surface.border` and `shadow.floating`. Variants: `bar` (the tab bar pill),
`sheet` and `circle` (a `layout.controlHeight` circle for the floating detail
buttons). An optional `tint` (a cover's dominant color, a runtime value) colors the glass or replaces the
fallback's `color.surface.raised`.

## Detail screen base

`DetailScreen` from `@beatly/ui/native`. Used by the album, playlist and artist screens. In the ready body the scroll drives, on the
native driver, the cover shrinking to `motion.detailCollapse.coverScale` and fading, then the floating buttons, the title and the top bar
fading, each over `motion.detailCollapse.fade` points of scroll, the bar starting `motion.detailCollapse.barLead` of a fade before the
title is under it. The ranges come from the measured hero and title heights: the title is gone once its bottom (hero plus title on the
cover hero, the hero on the image hero) passes `topInset + layout.controlHeight`; the title fades in the fade before that, the buttons in
the fade before the title, the cover shrinks until the title starts. On iOS the floating back is not part of the collapse: it never fades and always takes touches; only the floating more fades over the buttons' range. Before the heights are measured nothing moves. Under reduce motion
the cover does not scale; the fades stay.

Entry: in the ready body the content enters once per mount in a top-down cascade on the native driver, in wrappers separate from the collapse's layers: the hero (on the image hero its surface, image and fade), the title, the children, the first `motion.detailCascade.firstRows` rows, then the rows drawn with them, with the slot after the rows (the album's and artist's carousels) in that same last step, under one wrapper. Each goes from opacity 0 and `motion.detailCascade.offset` lower to its place in `motion.detailCascade.duration`, `motion.detailCascade.stagger` after the previous one. It starts at once when the body becomes ready (replacing the skeleton), and after `motion.detailCascade.navigationDelay` when the body is ready at mount. That delay is a fixed estimate (350 ms) of the native stack push, not tied to the end of the transition: if the push timing changes nothing adjusts, so it is tuned on device. Rows drawn later (scroll, next page) and the floating buttons never animate. The buttons stay out so the native glass installs at full opacity. Under reduce motion everything is at rest from the first frame, or as soon as it turns on.

- Hero: a `layout.heroCover` cover in `radius.sm` with `shadow.cover`, centered
  over a wash. The cover follows `Cover`'s rules: a mosaic with four urls, an image, the
  accent tile with a glyph, or the placeholder. The wash is `color.surface.base` until a dominant color is known,
  then a vertical gradient from that color to `color.surface.base`, drawn at once.
- Image hero (artist): the image stretched to the full width at `layout.heroImageRatio`, at most
  `layout.heroImageMaxHeightShare` of the window height, cropped to fill (`cover`) and centered,
  on `color.surface.card`, a vertical fade from `color.overlay.clear` to
  `color.surface.base` over its bottom half, and the title over it at the bottom left in
  `typography.display`, `layout.gutter` from the side and `spacing.lg` from the bottom.
  No wash. `color.overlay.clear` is `color.surface.base` at zero alpha, so the two must change together.
- Body: a `FlatList`; the hero, the title and the children are its header, and optional
  rows follow, paged with `onEndReached`.
- Slot after the rows: an optional block the screen passes (`afterRows`), drawn under the rows and the next-page skeleton; it enters with the later rows and is at rest when it mounts after the cascade.
- Virtualization: the rows are the `FlatList`'s items, so a long album or popular list is virtualized: rows past the initial window render on scroll, already at rest. The slot after the rows is the list footer and mounts from the first render, below a spacer, whatever the list's length. A fast scroll on a very long list is checked on device for blank rows.
- Creator line (playlist): a `layout.creatorMark` mark (avatar or brand mark on
  `color.accent.primary`, `radius.full`) with the name in `typography.rowTitle`, gap
  `spacing.sm`.
- Action row: `DetailActions`, `layout.gutter` sides. Centered (own, album, genre): a group centered with `layout.gap` between the buttons and the play button's fixed `layout.playButtonPill` slot; as the pill shrinks the side buttons move toward the center with it and end `layout.gap` from the circle:
  `DetailActions` owns the shared shrink value and passes it to `PlayButton` and the side buttons; the play slot keeps the fixed `layout.playButtonPill` width, and its touch area switches from the pill to the circle in the commit that ends the shrink, so nothing moves on screen when it does; the side buttons carry `layout.sideButtonStack`, above the play slot, so a tap on them wins while they slide over it.
  shuffle (`IconButton` plain), play (`PlayButton`), and save (`IconButton` plain, plus or check,
  selected when saved) on albums and genre playlists and, on an own playlist only, the options button after play (`IconButton` plain `ellipsis`, opening a sheet). `PlayButton`: idle, a `layout.playButtonPill` × `layout.playButtonMedium`
  pill in `color.accent.primary`, the play glyph (`icon.size.lg`) and the
  label in `typography.button` `color.text.inverse`, `spacing.sm` apart; loading, playing and paused,
  a `layout.playButtonMedium` circle with a spinner, the pause glyph or the play glyph. Leaving idle
  the label fades in `motion.playButton.labelFade`, then the pill, holding the play glyph, shrinks to the circle in `motion.playButton.shrink` (`Easing.inOut(Easing.ease)`: two `radius.full` caps move toward the center and the bridge between them scales to nothing, on the native driver, with no width animated), and draws the spinner or glyph only when the shrink ends; becoming pause it scales in from
  `motion.enterScale` in `motion.playButton.scaleIn`; under reduce motion none of them. Disabled on
  `color.surface.control` with the glyph in `color.text.disabled`. Wide (liked): two `Button` pills with `fill`, `layout.controlHeight` tall and `layout.gap` apart, glyph (`icon.size.lg`) and label `spacing.sm` apart: play `primary` (pause glyph and label while the list plays, the spinner while it loads, no shrink) and shuffle `secondary` (`color.surface.control`).
- Title: `typography.title` under the hero. The base reserves no space for an action
  row; the screen owns the gap below its own title block.
- Top bar, on Android: from the top edge to `topInset + layout.controlHeight`, `layout.gutter` sides, filled with the dominant color or
  `color.surface.base`, no blur and no glass; an `IconButton` back, the title in `typography.subtitle` on one line centered, and more only
  with the `more` prop (a `layout.controlHeight` spacer otherwise). It takes touches only once it starts to appear, the floating buttons
  only until they have faded, neither in between; the faded set is hidden from assistive technology.
  The bar is a solid surface and catches every touch on its area once active, unlike the floating buttons, which let touches through
  around them. A three-valued phase owns the touches (floating while `offset < buttons[1]`, bar from `bar[0]`, neither in between);
  React state changes only when the phase changes. The separation depends on `motion.detailCollapse.barLead <= 1`: a value above 1
  would make both sets active at once.
  On iOS: the same strip, fade and range, but it reaches from the top edge to `spacing.sm` past `spacing.xs` under the floating back (`topInset + spacing.xs`,
  `layout.controlHeight`, `spacing.xs`, `spacing.sm`), so the button sits entirely inside it and the fade ends just under it. It has no background: a vertical
  `GradientFill` of the dominant color (`color.surface.base` without one) at `color.gradient.detailStrip.wash`, and over it `color.surface.base` at
  `color.gradient.detailStrip.shade`. Both end transparent, so the list passes under the strip with no edge. Under both, outside the strip (so no parent of the blur has an opacity), `BlurFill` blurs the content at `blur.detailStrip`, inside `AlphaMask` with a vertical `GradientFill` of `color.surface.base` at `color.gradient.detailStrip.blurMask`: full from the top to 55% of the strip's height, zero at its bottom edge. The mask's opacity is the strip's, so the blur appears with it, also under reduce motion where both follow the scroll; it is mounted once the ranges are measured and made visible only by that mask opacity (0 at the top), so there is no blur at the top and none pops in on a fast flick. The blur takes no touches (`pointerEvents="none"`). `BlurFill` is the only importer of `expo-blur` and `AlphaMask` of the masked view (ADR 026). The strip's transparent bottom still catches touches once active. It has no back of its own: a
  `layout.controlHeight` slot under the fixed floating back, then the title in `typography.subtitle` on one line centered between two
  `layout.controlHeight` slots, at the back's vertical center, and more only with the `more` prop. The floating back is drawn above the bar,
  so the bar catches touches on its area without blocking it. The phase hands over only the mores: the floating more while
  `offset < buttons[1]`, the bar's from `bar[0]`.
- Platform difference, a design decision of this change: iOS and Android draw different bars. On iOS the native-glass floating back stays fixed in every phase and the fading strip fades in behind it, with no back of its own in the bar; on Android the bar carries its own back and the floating buttons hand over to it.
- Floating back and more buttons: `GlassSurface` `circle` over the hero in
  every state; in the ready body, on Android both fade out with the scroll; on iOS the back stays fixed, opaque and touchable in every phase, and only the more fades. The more button is drawn only when the screen passes a `more` prop.
- Skeleton: `DetailSkeleton`, a static cover block, a title bar, a meta bar and
  `layout.skeletonRows` track rows in `color.surface.border`, bar widths from `layout.skeletonBar`. With
  `hero: "image"` (artist) the cover is a full-width `layout.heroImageRatio` block, capped like the loaded hero, with the
  title bar at its bottom left, then the meta bar and the rows.
- While the next page of a paged detail list loads, `DetailScreen` draws `layout.skeletonRows` of the same `SkeletonRow` under the rows (`layout.gutter` sides, `spacing.md` apart and above), announced as a progress bar; the list asks for that page `END_REACHED_THRESHOLD` (2) visible lengths before its end.
- Track row: `TrackRow`, a `meta` number in a `layout.trackNumber` column, the
  title in `typography.rowTitle` and the artists in `typography.meta`;
  unavailable uses `color.text.disabled`. `MediaRow` with `available={false}` draws its title
  and meta in `color.text.disabled` the same way. An unavailable row is never pressable and is one
  element announced by the caller's `unavailableLabel`. Only the album and artist lists can carry
  an unavailable track: the contract makes playlist, search, up next and related tracks always
  playable (a null `track_id` there is a schema failure, drawn as the generic error), so those
  lists do not pass `available`.
- The current track's row: no background of its own, only `NowPlayingBars` (three
  `layout.nowPlayingBarWidth` bars in `color.accent.primary`, `spacing.xxs` apart, `icon.size.sm`
  tall, rising and falling to `motion.nowPlaying.minScale` over `motion.nowPlaying.durations`, frozen
  while paused, at `motion.nowPlaying.staticScales` under reduce motion) in place of the number
  (`TrackRow`) or centered over the cover on `color.overlay.onImage` (`MediaRow`).

## Player

- Mini player: `MiniPlayer` on a `GlassSurface` `bar` with `tint`, a round `Cover` of `layout.rowCover`, the
  title in `typography.rowTitle`, the subtitle in `typography.meta` (`color.status.error` on a failure), then
  play or pause and next as `IconButton`s. Content height `layout.controlHeight`, so the pill has the tab bar's height.
  A `spacing.md` gap above the floating tab bar. Width: the window width minus `layout.gutter` on each side on Android
  and iOS < 26, the same width as the tab bar pill below it; inside the iOS 26+ system accessory it draws bare (no `GlassSurface`,
  no tint), filling and clipped to the system's frame.
- Seek bar: `SeekBar`, a `layout.seekTrack` track in `color.overlay.muted`, `radius.full`, the fill in
  `color.text.primary`, a `layout.seekThumb` thumb in `color.accent.primary` with `shadow.control`, a
  `layout.seekThumb` tall bar with a vertical `hitSlop` up to `layout.controlHeight`, the times `spacing.sm` below in
  `typography.meta` and `color.text.secondary`.
- Player screen: `spacing.xl` sides; a `layout.controlHeight` header with the chevron-down close (`icon.size.lg`), "Playing from" in
  `typography.label` / `color.text.secondary` over the source in `typography.rowTitle`, and the track menu's more button at its end; a wash from the dominant color to
  `color.surface.base` by the middle of the screen (three stops); `spacing.xl` below, a square cover as wide as the
  content, `radius.md`, `shadow.cover`; `spacing.xxl` below, a row with `layout.gap`: the titles (`typography.title` in a `Marquee`, `typography.body` in
  `color.text.secondary`) and the heart `IconButton` (`icon.size.lg`, filled and `color.text.primary` when liked, `color.text.secondary` otherwise); `spacing.xl` below, the seek bar; `spacing.lg` below, the controls spread across the width:
  shuffle and repeat at `icon.size.md` (`color.text.secondary`, `color.text.primary` on), previous and next filled at
  `icon.size.xl`, and play or pause in a `layout.playButton` circle in `color.accent.primary` with a `color.text.inverse`
  glyph. The column scrolls when it does not fit. Dragged down it follows the finger and closes past `motion.dragToClose.distanceShare` of the window height or above `motion.dragToClose.velocity`, springing back with `motion.spring` otherwise; the cover drops to `motion.pausedScale` while paused. Under reduce motion nothing moves or scales and the route fades. iOS has no close button.
- Player sheet: `PullUpSheet`, opened by a drag up on, or a press of, a handle (`layout.handleWidth` x `layout.handleHeight`,
  `radius.full`, `color.overlay.muted`; on Android `layout.handleWidthAndroid` x `layout.handleHeightAndroid` in `color.overlay.handleAndroid`) centered in a `layout.controlHeight` row above the bottom inset; the handle bounces twice,
  `motion.handleNudge.first` then `motion.handleNudge.second`, each leg `motion.duration.fast`, settling with `motion.spring`, the first time the player opens on each track. While the sheet moves, the player
  darkens to `color.overlay.backdrop` and drops to `motion.behindSheetScale` with the sheet's position. The panel is full screen,
  `radius.lg` top corners, `shadow.floating`, with the wash from the dominant color to `color.surface.base`; a downward
  drag on its header (or its list at the top) closes it past the `motion.dragToClose.*` thresholds. The header is the song row (a
  `layout.rowCoverMedium` cover at `radius.sm`, `typography.title`, `typography.body` in `color.text.secondary`, and an
  `IconButton` `primaryCompact`, a `layout.controlHeight` circle in `color.accent.primary` with a `color.text.inverse` glyph),
  then a `SegmentedControl` (options of `layout.chipHeight` on `color.overlay.subtle`, the selected one on `color.overlay.muted`
  in `color.text.primary`). Rows are `MediaRow`s; synced lyrics are `typography.title` lines, `color.text.primary` for the playing
  one and `color.text.tertiary` for the others. Under reduce motion the sheet and the dim fade and nothing moves or scales.

## Track menu

- More button: an `IconButton` `ellipsis` (`layout.controlHeight`, `icon.size.lg`) at the end of a row, outside the pressable body of `MediaRow` and `TrackRow` (their `trailing` slot).
- `ActionRow`: `layout.controlHeight` tall, `spacing.sm` vertical padding, `layout.gap` between the icon (`icon.size.md`) and the label (`typography.body`), `color.text.primary`, or `color.status.error` when destructive; pressed `motion.pressOpacity`.
- `Notice`: `spacing.sm` between the glyph (`icon.size.md`, `color.status.success` or `color.status.error`) and the line (`typography.meta`, `color.text.primary`); floating, it sits on a `GlassSurface` `bar`, `layout.gutter` from the sides and `spacing.md` above the bottom inset, for `motion.duration.notice`.
- `Marquee`: one line of any `typography` role that scrolls to its end and back, resting `motion.marquee.pause` at each end at `motion.marquee.speed`, only when it does not fit; under reduce motion it is a static line with a tail ellipsis.
- `NativeMenu`: the iOS system menu behind the more button (ADR 023): `icon.size.lg` ellipsis in `color.text.primary` in a `layout.controlHeight` square; SF Symbols for its items, the destructive one in the system red.
- Sheets (picker, credits): the `Sheet` shrinks to the room left and scrolls its list; `topInset` keeps it below the status bar; `typography.subtitle` title, `spacing.md` to `spacing.lg` gaps, rows as `MediaRow` (`size="medium"`).

## Edit list

- `NativeEditList` (iOS with the ExpoUI module, ADR 025): a SwiftUI `List` in edit mode, plain style, scroll background hidden on `color.surface.base`; each row is `typography.rowTitle` in `color.text.primary` over `typography.meta` in `color.text.secondary`, without a cover; the system draws the handles and the delete.
- `ReorderList` (Android and the iOS fallback): rows `layout.controlHeight + 2 * spacing.xs` tall: an `IconButton` `x`, a `MediaRow` `regular`, and a `layout.controlHeight` handle with `gripVertical`. The held row is lifted on `color.surface.raised` with `shadow.floating`; the others make room over `motion.duration.fast`; the list auto-scrolls inside `motion.reorder.edge` of either end at `motion.reorder.speed`.

## Bug reports

- `Badge`: a read-only status pill, `typography.label` text on `color.overlay.subtle`, `radius.sm`, `spacing.sm` horizontal and `spacing.xxs` vertical padding; open in `color.text.primary`, closed in `color.text.tertiary`.
- Form: a multiline `Input` at `layout.textAreaHeight` minimum, the category `Chip`s wrapping `spacing.sm` apart, `spacing.lg` between the form's parts.
- Report row: a `MediaRow` with the `flag` tile and the `Badge` trailing.

## Profile

- `AvatarRow`: the `ActionRow` row (`layout.controlHeight`, `spacing.sm` vertical, `layout.gap`), the header `Avatar`, `typography.rowTitle` over `typography.meta` in `color.text.secondary`, and a trailing `chevronRight` at `icon.size.md` in `color.text.tertiary`.
- The profile avatar: `layout.profileAvatar`, initials in `typography.display`, or the `user` icon at `icon.size.xl`.
- `ProfileSkeleton`: `SkeletonCircle` at `layout.profileAvatar`, a `typography.title` bar at `layout.skeletonBar.title` and a `typography.body` bar at `.meta`, then a `Card` with two `typography.label` / `typography.body` bar pairs at `.rowMeta` / `.rowTitle`. All in `color.surface.border`, bars `radius.sm`, circles `radius.full`, no motion.
- New skeletons build on the exported `SkeletonBar` and `SkeletonCircle` of `Skeleton.tsx`; `DetailSkeleton` keeps its private bars and exports its `SkeletonRow` for the detail list's footer, which draws it before the slot after the rows when the screen passes one.
- `AvatarRow` with no identity: `SkeletonCircle` at `layout.avatar` and a `typography.rowTitle` bar at `.rowTitle`.

## Radius (`radius`)

| Role                                                          | Token         |
| ------------------------------------------------------------- | ------------- |
| Small radius (badges, covers)                                 | `radius.sm`   |
| Medium radius (cards, inputs, form buttons, the player cover) | `radius.md`   |
| Large radius (sheets, large cards, form card, brand mark)     | `radius.lg`   |
| Fully round (pills, chips, circular avatars/buttons)          | `radius.full` |

## Border (`border`)

| Role                  | Token                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standard border width | `border.width`                                                                                                                                                                                                        |
| Hairline border       | `border.hairline` from `@beatly/ui/native` (`StyleSheet.hairlineWidth`). Native-only tokens live in that entry, not the main barrel, because `apps/mobile/app.config.ts` loads `@beatly/ui`'s main barrel under Node. |

## Typography (`typography`, `maxFontScale`)

Roles, not raw sizes. Every role uses the platform's system font (no
`fontFamily` override).

| Role                    | Token                 | Used for                                                               |
| ----------------------- | --------------------- | ---------------------------------------------------------------------- |
| Display                 | `typography.display`  | The largest number/title on a screen                                   |
| Brand                   | `typography.brand`    | The Beatly wordmark on the auth screens                                |
| Title                   | `typography.title`    | Screen title                                                           |
| Section                 | `typography.section`  | Section heading                                                        |
| Subtitle                | `typography.subtitle` | Card/sheet subtitle, the detail top bar's title                        |
| Row title               | `typography.rowTitle` | Track/list row title                                                   |
| Body                    | `typography.body`     | Default paragraph/body text                                            |
| Link                    | `typography.link`     | Inline link inside body text                                           |
| Meta                    | `typography.meta`     | Secondary/meta text (duration, counts)                                 |
| Label                   | `typography.label`    | Uppercase label (badge, form label)                                    |
| Button                  | `typography.button`   | Button text                                                            |
| Accessibility scale cap | `maxFontScale`        | `maxFontSizeMultiplier` the `ui` Text, Input and Link components apply |

## Motion (`motion`)

| Role                                                                                                                                                  | Token                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Fast transition                                                                                                                                       | `motion.duration.fast`                                 |
| Base transition                                                                                                                                       | `motion.duration.base`                                 |
| Slow transition                                                                                                                                       | `motion.duration.slow`                                 |
| Shimmer loop (skeleton)                                                                                                                               | `motion.duration.shimmer`                              |
| How long a brief notice stays                                                                                                                         | `motion.duration.notice`                               |
| The one spring (the player cover's pause scale, a drag that springs back, the sheet opening and closing, the handle settling after its double bounce) | `motion.spring` (`damping`, `stiffness`)               |
| Opacity of a pressed control                                                                                                                          | `motion.pressOpacity`                                  |
| Scale the player cover drops to while paused                                                                                                          | `motion.pausedScale`                                   |
| Scale the player drops to behind the open sheet                                                                                                       | `motion.behindSheetScale`                              |
| Scale a control starts from when it enters (the detail play button becoming pause)                                                                    | `motion.enterScale`                                    |
| The detail play button's label fade, pill shrink and pause scale-in, in ms                                                                            | `motion.playButton.labelFade` / `.shrink` / `.scaleIn` |
| Lowest a now playing bar falls to, as a share of its height                                                                                           | `motion.nowPlaying.minScale`                           |
| Milliseconds each now playing bar takes to rise or to fall (different per bar)                                                                        | `motion.nowPlaying.durations`                          |
| Each now playing bar's height while static under reduce motion                                                                                        | `motion.nowPlaying.staticScales`                       |
| Points per second a title that does not fit scrolls (`Marquee`)                                                                                       | `motion.marquee.speed`                                 |
| Rest, in ms, at each end of a `Marquee` scroll                                                                                                        | `motion.marquee.pause`                                 |
| Points the sheet handle rises in the first and the second bounce of its nudge                                                                         | `motion.handleNudge.first` / `.second`                 |
| Travel, in points, before a vertical drag is taken (the player's close, the sheet's open and close)                                                   | `motion.dragToClose.slop`                              |
| Share of the window height a released vertical drag must pass to commit                                                                               | `motion.dragToClose.distanceShare`                     |
| Speed, in points per millisecond, that commits a vertical drag on release                                                                             | `motion.dragToClose.velocity`                          |
| Points from the top or bottom of a reorder list where a held row starts the auto-scroll (`ReorderList`)                                               | `motion.reorder.edge`                                  |
| Points per second a reorder list auto-scrolls while a row is held at its edge (`ReorderList`)                                                         | `motion.reorder.speed`                                 |
| Points of scroll each detail header layer takes to fade (floating buttons, title, top bar)                                                            | `motion.detailCollapse.fade`                           |
| Scale the detail hero cover shrinks to as it scrolls away                                                                                             | `motion.detailCollapse.coverScale`                     |
| Share of a fade the detail top bar starts before the title is under it                                                                                | `motion.detailCollapse.barLead`                        |
| Milliseconds each detail content block takes to enter                                                                                                 | `motion.detailCascade.duration`                        |
| Milliseconds between the starts of two detail content blocks                                                                                          | `motion.detailCascade.stagger`                         |
| Points lower than its place a detail content block enters from                                                                                        | `motion.detailCascade.offset`                          |
| Rows in the first row step of the detail entry                                                                                                        | `motion.detailCascade.firstRows`                       |
| Milliseconds the detail entry waits when the content is ready at mount (after the navigation transition)                                              | `motion.detailCascade.navigationDelay`                 |

`VerticalDrag` (the one vertical drag), `DragToClose` and `PullUpSheet` over it, `PauseScale`, `Marquee`, `NowPlayingBars`, `PlayButton` and `ReorderList` and `DetailScreen` in `@beatly/ui/native` are the only animated components. They use React Native's `Animated` (and `Animated.event` for the detail scroll, `Animated.timing` for its entry cascade) with the native driver and `PanResponder`, and take `reduceMotion` from the app.

## Icons (`icon`)

Sizes and stroke. The component is `Icon` in `@beatly/ui/native`, the
only importer of `lucide-react-native`.

| Role                                          | Token            |
| --------------------------------------------- | ---------------- |
| Small icon                                    | `icon.size.sm`   |
| Medium icon                                   | `icon.size.md`   |
| Large icon                                    | `icon.size.lg`   |
| Extra-large icon                              | `icon.size.xl`   |
| Hero icon (empty states, the auth brand mark) | `icon.size.hero` |
| Stroke width                                  | `icon.stroke`    |

`Icon` draws a glyph filled in its tone with `filled`; `IconButton` takes an `iconSize`.

## Shadows (`shadow`)

All black; iOS reads `shadowOpacity`/`shadowRadius`/`shadowOffset`,
Android reads `elevation`.

| Role                                            | Token             |
| ----------------------------------------------- | ----------------- |
| Cover art / hero image                          | `shadow.cover`    |
| Floating control (mini player, floating action) | `shadow.floating` |
| Small control (icon button, the seek bar thumb) | `shadow.control`  |

## Blur (`blur`)

iOS only. The intensity is the blur library's 0-100 scale (a share of the system blur), not points; the tint is the system material. Tuned on the phone.

| Role                                               | Token                                  |
| -------------------------------------------------- | -------------------------------------- |
| Content under the iOS detail strip, about 4 points | `blur.detailStrip.intensity` / `.tint` |

## Decorative palettes (`genrePalette`, `avatarPalette`)

Product content, migrated from the legacy inventory as-is. Weekly
replay palettes are out of scope.

| Role                                                                                                                                                                          | Token                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Genre card gradient, keyed by genre slug (`dance-electronic`, `decades`, `hip-hop`, `indie-alternative`, `jazz`, `pop`, `rnb-soul`, `rock`, `tropical`, `urbano`, `fallback`) | `genrePalette["<slug>"]` |
| Avatar-by-initials gradient, picked by hash of name/email modulo the palette length                                                                                           | `avatarPalette[n]`       |
