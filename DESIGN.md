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

| Role                                                                                                                             | Token                    |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Base background of every screen                                                                                                  | `color.surface.base`     |
| Sheet, modal, dialog and form `Card` background (the `ui` `Card` is only this raised card; a list card is a different component) | `color.surface.raised`   |
| List card, input and image-placeholder background                                                                                | `color.surface.card`     |
| Secondary control background (secondary button, inactive chip/tab)                                                               | `color.surface.control`  |
| Card/sheet/input border, divider, skeleton base                                                                                  | `color.surface.border`   |
| Primary text                                                                                                                     | `color.text.primary`     |
| Secondary text (subtitles, artist names, descriptions)                                                                           | `color.text.secondary`   |
| Tertiary text (meta, captions)                                                                                                   | `color.text.tertiary`    |
| Disabled text                                                                                                                    | `color.text.disabled`    |
| Text drawn on a light/accent background                                                                                          | `color.text.inverse`     |
| The app's single accent (primary buttons, active state)                                                                          | `color.accent.primary`   |
| Destructive/error state                                                                                                          | `color.status.error`     |
| Success/confirmation state                                                                                                       | `color.status.success`   |
| Sheet/modal backdrop                                                                                                             | `color.overlay.backdrop` |
| Scrim over an image (behind a control or text)                                                                                   | `color.overlay.onImage`  |
| Subtle translucent fill (ghost button, translucent chip)                                                                         | `color.overlay.subtle`   |
| Muted translucent fill (seek track, icon-button background)                                                                      | `color.overlay.muted`    |

## Spacing and layout (`spacing`, `layout`)

| Role                                                                                                          | Token                                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Spacing scale, multiples of four                                                                              | `spacing.xxs` … `spacing.xxl`                    |
| Screen edge padding                                                                                           | `layout.gutter`                                  |
| Gap between items in a list/row                                                                               | `layout.gap`                                     |
| Minimum touch target padding (`hitSlop`)                                                                      | `layout.hitSlop`                                 |
| Height of a form control (input, form button) or a floating tab bar item, and side of its square touch target | `layout.controlHeight`                           |
| Width of a carousel card and side of its cover                                                                | `layout.carouselCard`                            |
| Side of the header account avatar                                                                             | `layout.avatar`                                  |
| Width of a floating tab bar item                                                                              | `layout.tabItemWidth`                            |
| Height of a filter chip                                                                                       | `layout.chipHeight`                              |
| Width / height of the genre accent bar in a genre row                                                         | `layout.genreBarWidth` / `layout.genreBarHeight` |
| Side of the cover in a list row                                                                               | `layout.rowCover`                                |
| Side of the cover in the large list row (search top artist)                                                   | `layout.rowCoverLarge`                           |

## Floating surfaces

`GlassSurface` from `@beatly/ui/native`, the only importer of
`expo-glass-effect`: native glass on iOS 26+, elsewhere
`color.surface.raised` with a `border.width` border in
`color.surface.border` and `shadow.floating`.

## Radius (`radius`)

| Role                                                      | Token         |
| --------------------------------------------------------- | ------------- |
| Small radius (badges, covers)                             | `radius.sm`   |
| Medium radius (cards, inputs, form buttons)               | `radius.md`   |
| Large radius (sheets, large cards, form card, brand mark) | `radius.lg`   |
| Fully round (pills, chips, circular avatars/buttons)      | `radius.full` |

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

| Role                         | Token                                    |
| ---------------------------- | ---------------------------------------- |
| Fast transition              | `motion.duration.fast`                   |
| Base transition              | `motion.duration.base`                   |
| Slow transition              | `motion.duration.slow`                   |
| Shimmer loop (skeleton)      | `motion.duration.shimmer`                |
| The one spring               | `motion.spring` (`damping`, `stiffness`) |
| Opacity of a pressed control | `motion.pressOpacity`                    |

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

## Shadows (`shadow`)

All black; iOS reads `shadowOpacity`/`shadowRadius`/`shadowOffset`,
Android reads `elevation`.

| Role                                            | Token             |
| ----------------------------------------------- | ----------------- |
| Cover art / hero image                          | `shadow.cover`    |
| Floating control (mini player, floating action) | `shadow.floating` |
| Small control (icon button)                     | `shadow.control`  |

## Decorative palettes (`genrePalette`, `avatarPalette`)

Product content, migrated from the legacy inventory as-is. Weekly
replay palettes are out of scope.

| Role                                                                                                                                                                          | Token                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Genre card gradient, keyed by genre slug (`dance-electronic`, `decades`, `hip-hop`, `indie-alternative`, `jazz`, `pop`, `rnb-soul`, `rock`, `tropical`, `urbano`, `fallback`) | `genrePalette["<slug>"]` |
| Avatar-by-initials gradient, picked by hash of name/email modulo the palette length                                                                                           | `avatarPalette[n]`       |
