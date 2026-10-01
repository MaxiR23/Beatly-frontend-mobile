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

| Role                                                                                                                             | Token                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Base background of every screen                                                                                                  | `color.surface.base`                                                                         |
| Sheet, modal, dialog and form `Card` background (the `ui` `Card` is only this raised card; a list card is a different component) | `color.surface.raised`                                                                       |
| List card, input and image-placeholder background                                                                                | `color.surface.card`                                                                         |
| Secondary control background (secondary button, inactive chip/tab)                                                               | `color.surface.control`                                                                      |
| Card/sheet/input border, divider, skeleton base                                                                                  | `color.surface.border`                                                                       |
| Primary text                                                                                                                     | `color.text.primary`                                                                         |
| Secondary text (subtitles, artist names, descriptions)                                                                           | `color.text.secondary`                                                                       |
| Tertiary text (meta, captions)                                                                                                   | `color.text.tertiary`                                                                        |
| Disabled text                                                                                                                    | `color.text.disabled`                                                                        |
| Text drawn on a light/accent background                                                                                          | `color.text.inverse`                                                                         |
| The app's single accent (primary buttons, active state)                                                                          | `color.accent.primary`                                                                       |
| Switch: track and thumb when on, track and thumb when off                                                                        | `color.accent.primary` / `color.text.inverse`, `color.surface.border` / `color.text.primary` |
| Destructive/error state                                                                                                          | `color.status.error`                                                                         |
| Success/confirmation state                                                                                                       | `color.status.success`                                                                       |
| Sheet/modal backdrop                                                                                                             | `color.overlay.backdrop`                                                                     |
| Scrim over an image (behind a control or text)                                                                                   | `color.overlay.onImage`                                                                      |
| Subtle translucent fill (ghost button, translucent chip)                                                                         | `color.overlay.subtle`                                                                       |
| Muted translucent fill (seek track, icon-button background)                                                                      | `color.overlay.muted`                                                                        |
| Clear start of a fade into the base surface (the detail hero image); the see-through container of the player route               | `color.overlay.clear`                                                                        |

## Spacing and layout (`spacing`, `layout`)

| Role                                                                                                                                               | Token                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Spacing scale, multiples of four                                                                                                                   | `spacing.xxs` … `spacing.xxl`                                   |
| Screen edge padding                                                                                                                                | `layout.gutter`                                                 |
| Gap between items in a list/row                                                                                                                    | `layout.gap`                                                    |
| Minimum touch target padding (`hitSlop`)                                                                                                           | `layout.hitSlop`                                                |
| Height of a form control (input, form button) or a floating tab bar item, the height of the player header row, and side of its square touch target | `layout.controlHeight`                                          |
| Width of a carousel card and side of its cover                                                                                                     | `layout.carouselCard`                                           |
| Side of the header account avatar                                                                                                                  | `layout.avatar`                                                 |
| Side of the leading mark (avatar or brand mark) in a detail creator line                                                                           | `layout.creatorMark`                                            |
| Width of a floating tab bar item                                                                                                                   | `layout.tabItemWidth`                                           |
| Height of a filter chip and of a segmented control option                                                                                          | `layout.chipHeight`                                             |
| Width / height of the genre accent bar in a genre row                                                                                              | `layout.genreBarWidth` / `layout.genreBarHeight`                |
| Side of the cover in a list row and in the mini player                                                                                             | `layout.rowCover`                                               |
| Side of the cover in the medium list row (library) and the song row of the player sheet                                                            | `layout.rowCoverMedium`                                         |
| Side of the cover in the large list row (search top artist)                                                                                        | `layout.rowCoverLarge`                                          |
| Side of the cover in a detail hero                                                                                                                 | `layout.heroCover`                                              |
| Width / height ratio of the full-width detail hero image                                                                                           | `layout.heroImageRatio`                                         |
| Share of the window height the detail hero image may take at most                                                                                  | `layout.heroImageMaxHeightShare`                                |
| Width of the track-number column in a track row                                                                                                    | `layout.trackNumber`                                            |
| Side of the large play or pause button of the player                                                                                               | `layout.playButton`                                             |
| Height of the seek bar track / side of its thumb                                                                                                   | `layout.seekTrack` / `layout.seekThumb`                         |
| Width / height of the sheet handle bar                                                                                                             | `layout.handleWidth` / `layout.handleHeight`                    |
| Width of a detail skeleton placeholder bar (title, meta, row title, row meta), as a share of its row                                               | `layout.skeletonBar.title` / `.meta` / `.rowTitle` / `.rowMeta` |

## Floating surfaces

`GlassSurface` from `@beatly/ui/native`, the only importer of
`expo-glass-effect`: native glass on iOS 26+, elsewhere
`color.surface.raised` with a `border.width` border in
`color.surface.border` and `shadow.floating`. Variants: `bar` (the tab bar pill),
`sheet` and `circle` (a `layout.controlHeight` circle for the floating detail
buttons). An optional `tint` (a cover's dominant color, a runtime value) colors the glass or replaces the
fallback's `color.surface.raised`.

## Detail screen base

`DetailScreen` from `@beatly/ui/native`. Used by the album, playlist and artist screens. It draws statically: nothing moves with the
scroll.

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
- Creator line (playlist): a `layout.creatorMark` mark (avatar or brand mark on
  `color.accent.primary`, `radius.full`) with the name in `typography.rowTitle`, gap
  `spacing.sm`.
- Title: `typography.title` under the hero. The base reserves no space for an action
  row; the screen owns the gap below its own title block.
- Floating back and more buttons: `GlassSurface` `circle` fixed over the hero, in
  every state. The more button is drawn only when the screen passes a `more` prop.
- Skeleton: `DetailSkeleton`, a static cover block, a title bar, a meta bar and six
  track rows in `color.surface.border`, bar widths from `layout.skeletonBar`. With
  `hero: "image"` (artist) the cover is a full-width `layout.heroImageRatio` block, capped like the loaded hero, with the
  title bar at its bottom left, then the meta bar and the rows.
- Track row: `TrackRow`, a `meta` number in a `layout.trackNumber` column, the
  title in `typography.rowTitle` and the artists in `typography.meta`;
  unavailable uses `color.text.disabled`. `MediaRow` with `available={false}` draws its title
  and meta in `color.text.disabled` the same way.

## Player

- Mini player: `MiniPlayer` on a `GlassSurface` `bar` with `tint`, a round `Cover` of `layout.rowCover`, the
  title in `typography.rowTitle`, the subtitle in `typography.meta` (`color.status.error` on a failure), then
  play or pause and next as `IconButton`s. Content height `layout.controlHeight`, so the pill has the tab bar's height.
  A `spacing.md` gap above the floating tab bar; inside the iOS 26+ system accessory it draws bare (no `GlassSurface`,
  no tint), filling and clipped to the system's frame.
- Seek bar: `SeekBar`, a `layout.seekTrack` track in `color.overlay.muted`, `radius.full`, the fill in
  `color.text.primary`, a `layout.seekThumb` thumb in `color.accent.primary` with `shadow.control`, a
  `layout.seekThumb` tall bar with a vertical `hitSlop` up to `layout.controlHeight`, the times `spacing.sm` below in
  `typography.meta` and `color.text.secondary`.
- Player screen: `spacing.xl` sides; a `layout.controlHeight` header with the chevron-down close (`icon.size.lg`), "Playing from" in
  `typography.label` / `color.text.secondary` over the source in `typography.rowTitle`; a wash from the dominant color to
  `color.surface.base` by the middle of the screen (three stops); `spacing.xl` below, a square cover as wide as the
  content, `radius.md`, `shadow.cover`; `spacing.xxl` below, `typography.title` and `typography.body` in
  `color.text.secondary`; `spacing.xl` below, the seek bar; `spacing.lg` below, the controls spread across the width:
  shuffle and repeat at `icon.size.md` (`color.text.secondary`, `color.text.primary` on), previous and next filled at
  `icon.size.xl`, and play or pause in a `layout.playButton` circle in `color.accent.primary` with a `color.text.inverse`
  glyph. The column scrolls when it does not fit. Dragged down it follows the finger and closes past `motion.dragToClose.distanceShare` of the window height or above `motion.dragToClose.velocity`, springing back with `motion.spring` otherwise; the cover drops to `motion.pausedScale` while paused. Under reduce motion nothing moves or scales and the route fades. iOS has no close button.
- Player sheet: `PullUpSheet`, opened by a drag up on, or a press of, a handle (`layout.handleWidth` x `layout.handleHeight`,
  `radius.full`, `color.overlay.muted`) centered in a `layout.controlHeight` row above the bottom inset; the handle nudges
  `motion.handleNudge` with `motion.duration.base` and `motion.spring` the first three openings. While the sheet moves, the player
  darkens to `color.overlay.backdrop` and drops to `motion.behindSheetScale` with the sheet's position. The panel is full screen,
  `radius.lg` top corners, `shadow.floating`, with the wash from the dominant color to `color.surface.base`; a downward
  drag on its header (or its list at the top) closes it past the `motion.dragToClose.*` thresholds. The header is the song row (a
  `layout.rowCoverMedium` cover at `radius.sm`, `typography.title`, `typography.body` in `color.text.secondary`, and an
  `IconButton` `primaryCompact`, a `layout.controlHeight` circle in `color.accent.primary` with a `color.text.inverse` glyph),
  then a `SegmentedControl` (options of `layout.chipHeight` on `color.overlay.subtle`, the selected one on `color.overlay.muted`
  in `color.text.primary`). Rows are `MediaRow`s; synced lyrics are `typography.title` lines, `color.text.primary` for the playing
  one and `color.text.tertiary` for the others. Under reduce motion the sheet and the dim fade and nothing moves or scales.

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
| Subtitle                | `typography.subtitle` | Card/sheet subtitle                                                    |
| Row title               | `typography.rowTitle` | Track/list row title                                                   |
| Body                    | `typography.body`     | Default paragraph/body text                                            |
| Link                    | `typography.link`     | Inline link inside body text                                           |
| Meta                    | `typography.meta`     | Secondary/meta text (duration, counts)                                 |
| Label                   | `typography.label`    | Uppercase label (badge, form label)                                    |
| Button                  | `typography.button`   | Button text                                                            |
| Accessibility scale cap | `maxFontScale`        | `maxFontSizeMultiplier` the `ui` Text, Input and Link components apply |

## Motion (`motion`)

| Role                                                                                                                                          | Token                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Fast transition                                                                                                                               | `motion.duration.fast`                   |
| Base transition                                                                                                                               | `motion.duration.base`                   |
| Slow transition                                                                                                                               | `motion.duration.slow`                   |
| Shimmer loop (skeleton)                                                                                                                       | `motion.duration.shimmer`                |
| The one spring (the player cover's pause scale, a drag that springs back, the sheet opening and closing, the handle settling after its nudge) | `motion.spring` (`damping`, `stiffness`) |
| Opacity of a pressed control                                                                                                                  | `motion.pressOpacity`                    |
| Scale the player cover drops to while paused                                                                                                  | `motion.pausedScale`                     |
| Scale the player drops to behind the open sheet                                                                                               | `motion.behindSheetScale`                |
| Points the sheet handle rises when it nudges                                                                                                  | `motion.handleNudge`                     |
| Travel, in points, before a vertical drag is taken (the player's close, the sheet's open and close)                                           | `motion.dragToClose.slop`                |
| Share of the window height a released vertical drag must pass to commit                                                                       | `motion.dragToClose.distanceShare`       |
| Speed, in points per millisecond, that commits a vertical drag on release                                                                     | `motion.dragToClose.velocity`            |

`VerticalDrag` (the one vertical drag), `DragToClose` and `PullUpSheet` over it, and `PauseScale` in `@beatly/ui/native` are the only animated components. They use React Native's `Animated` with the native driver and `PanResponder`, and take `reduceMotion` from the app.

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

## Decorative palettes (`genrePalette`, `avatarPalette`)

Product content, migrated from the legacy inventory as-is. Weekly
replay palettes are out of scope.

| Role                                                                                                                                                                          | Token                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Genre card gradient, keyed by genre slug (`dance-electronic`, `decades`, `hip-hop`, `indie-alternative`, `jazz`, `pop`, `rnb-soul`, `rock`, `tropical`, `urbano`, `fallback`) | `genrePalette["<slug>"]` |
| Avatar-by-initials gradient, picked by hash of name/email modulo the palette length                                                                                           | `avatarPalette[n]`       |
