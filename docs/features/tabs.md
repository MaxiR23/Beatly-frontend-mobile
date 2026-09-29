# Tabs

The tab navigator of the signed-in app and its three placeholder tabs.

## Purpose

Four tabs: Home, Explore, Search and Library, icon only, each with an
accessible label. Explore, Search and Library show a placeholder until their
own issues.

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

The placeholder tabs have one state: an `EmptyState` with the tab's icon and
`tabs:placeholder`. Loading, data and error do not apply: they read no data.

| State            | What is drawn   | i18n keys          |
| ---------------- | --------------- | ------------------ |
| Loading          | n/a             |                    |
| With data        | n/a             |                    |
| Expected empty   | the placeholder | `tabs:placeholder` |
| Error with retry | n/a             |                    |

## Data

None.

## Navigation

The `(tabs)` group of the root stack, signed in only. `index` is Home; `explore`,
`search` and `library` are the placeholders.

## i18n namespace

`tabs`: `home`, `explore`, `search`, `library`, `placeholder`.

## Checked by hand

The native tab bar with Liquid Glass, its SF Symbols and VoiceOver labels on
iOS 26+, and the floating bar above the safe area on Android and older iOS.
