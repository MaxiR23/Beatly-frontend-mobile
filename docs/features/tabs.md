# Tabs

The tab navigator of the signed-in app.

## Purpose

Four tabs: Home, Explore, Search and Library, icon only, each with an
accessible label. Each tab has its own screen (`home.md`, `explore.md`,
`genre.md`, `search.md`, `library.md`).

## Layout

- iOS 26+: native tabs with system glass (`expo-router/unstable-native-tabs`)
  and SF Symbols: `house` / `house.fill`, `safari` / `safari.fill`,
  `magnifyingglass`, `books.vertical` / `books.vertical.fill`.
- Elsewhere: `FloatingTabBar`, a pill in `radius.full` on `GlassSurface` (solid
  fallback), `spacing.xs` padding and gap, each item `layout.tabItemWidth` by
  `layout.controlHeight`, icon `icon.size.lg`, the active item on
  `color.overlay.muted` with `color.text.primary`, inactive in
  `color.text.secondary`, `spacing.sm` above the bottom safe area.

## Platform differences

iOS 26+ draws the native tab bar; Android and older iOS draw `FloatingTabBar`.
`isGlassAvailable()` is the single test. See ADR 017.

## States

The navigator reads no data, so none of the states apply.

| State            | What is drawn | i18n keys |
| ---------------- | ------------- | --------- |
| Loading          | n/a           |           |
| With data        | n/a           |           |
| Expected empty   | n/a           |           |
| Error with retry | n/a           |           |

## Data

None.

## Navigation

The `(tabs)` group of the root stack, signed in only. `index` is Home; `explore` is a nested stack
(`explore/index`, `explore/genres/[slug]`); `search` is the search screen
(`search.md`); `library` is the library screen
(`library.md`).

## i18n namespace

`tabs`: `home`, `explore`, `search`, `library`.

## Checked by hand

The native tab bar with Liquid Glass, its SF Symbols and VoiceOver labels on
iOS 26+, and the floating bar above the safe area on Android and older iOS.
