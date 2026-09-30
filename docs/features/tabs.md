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

The mini player sits above the bar when a track is loaded: on iOS 26+ as
`NativeTabs.BottomAccessory`, bare inside the system's capsule, elsewhere as the `accessory` of `FloatingTabBar`, drawn `spacing.md` above the
pill at `floatingTabBarWidth`. Screens clear both with `useTabBarClearance`. See `player.md`.

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

The `(tabs)` group of the root stack, signed in only. The four tabs are the
groups `(home)`, `(explore)`, `(search)` and `(library)`; their route names are
the group names, and the URLs do not change: `/`, `/explore`, `/search`,
`/library`. One `_layout.tsx`, in the array group
`(home,explore,search,library)`, declares a stack for each tab, so every tab
keeps its own back stack and shares the detail routes declared in that folder:
`/album/[id]` (`album.md`) and `/artist/[id]` (`artist.md`). Every navigator paints
`color.surface.base` from the root navigation theme. The Explore tab's genre route
(`explore/genres/[slug]`) lives in its own group. A new detail screen is one
file in the array folder (ADR 020).

## i18n namespace

`tabs`: `home`, `explore`, `search`, `library`.

## Checked by hand

The native tab bar with Liquid Glass, its SF Symbols and VoiceOver labels on
iOS 26+, and the floating bar above the safe area on Android and older iOS.
