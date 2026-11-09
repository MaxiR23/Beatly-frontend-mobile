# Tabs

The tab navigator of the signed-in app.

## Purpose

Four tabs: Home, Explore, Search and Library, icon only on iOS and icon and
name on Android, each with an accessible label from `tabs`. Each tab has its own screen (`home.md`, `explore.md`,
`genre.md`, `search.md`, `library.md`).

## Layout

- iOS 26+: native tabs with system glass (`expo-router/native-tabs`)
  and SF Symbols: `house` / `house.fill`, `safari` / `safari.fill`,
  `magnifyingglass`, `books.vertical` / `books.vertical.fill`.
- iOS before 26: `FloatingTabBar`'s pill, a pill in `radius.full` on `GlassSurface` (solid
  fallback), the window width minus `layout.gutter` on each side, `spacing.xs`
  padding and gap, the items sharing its width evenly at
  `layout.controlHeight` high, icon `icon.size.lg`, the active item on
  `color.overlay.muted` with `color.text.primary`, inactive in
  `color.text.secondary`, `spacing.sm` above the bottom safe area.
- Android (ADR 035): the docked bar, a block at the bottom edge, full width, with no surface of its own: a `GradientFill` from `color.overlay.clear` to `color.surface.base` starting `spacing.xl` above its top element and ending at the tab row's top, and the tab row and the bottom inset on an opaque `color.surface.base` view. Four equal tabs, `TAB_ROW_HEIGHT` tall (at least `layout.controlHeight`), the icon `icon.size.lg` above the name, `spacing.xs` apart. Selected: `color.text.primary` and `typography.tabLabelSelected`, Home's icon filled. Unselected: `color.text.secondary` and `typography.meta`. No indicator; the press fades to `motion.pressOpacity`.

The mini player sits above the bar when a track is loaded: on iOS 26+ as
`NativeTabs.BottomAccessory`, bare inside the system's capsule, on iOS before 26 as the `accessory` of `FloatingTabBar`, drawn `spacing.xs` above the
pill at the same width, the window width minus `layout.gutter` on each side; on Android inside the docked block (a rectangle with `radius.sm` corners), `spacing.sm` from the sides and `spacing.xs` above the tabs. Screens clear all of them with `useTabBarClearance`, built on the window's bottom inset: on iOS 26+ a native tab's own inset already holds the tab bar, and the clearance adds the bar itself (issue 144). With a track loaded, `floatingTabBarClearance` adds `ACCESSORY_GAP` (`spacing.xs`) on every platform, one source for the gap, so on iOS 26+ the content's bottom padding is 8 smaller than before while the native accessory stays where it was; checked on a device. On Android the clearance is `dockedTabBarHeight`, the block's own height, so the last item rests at the fade's top. See `player.md`.

### Status strip

A single `StatusStrip` (`layout.statusStripHeight`) shows `common:connection.offline` while the device is offline, or the reason a track failed (`player:strip.*`, see `player.md`); a failed track wins over plain offline, so there is never more than one. It is `FloatingTabBar`'s `status` slot: on iOS before 26 above the mini player (or the pill) at the same width and `spacing.xs` gap; on Android inside the docked block, above the mini player or the tab row, `spacing.sm` from the sides and `spacing.xs` apart, inside the fade, which still ends where the tab row starts. `dockedTabBarHeight` and `floatingTabBarClearance` take a `status` flag that adds `layout.statusStripHeight` and the gap, so `useTabBarClearance` keeps the last item above it while it shows. On iOS 26+ the system owns the bottom accessory and has no slot for it, so the strip is an overlay over the native tabs (`BottomStatusOverlay`), placed at the floating bar's stack height plus the mini player's; that offset is an estimate from the floating geometry, like the clearance (issue 144). Offline, queries pause and loaded content stays; they refetch by themselves when the connection returns. See DESIGN.md, Status strip.

## Platform differences

Three branches: iOS 26+ draws the native tab bar, iOS before 26 the
`FloatingTabBar` pill, and Android the docked bar. `isGlassAvailable()` and
`isAndroidVariant()` are the tests. See ADR 017 and ADR 035.

## States

The navigator reads no data from the API, so none of the states apply; the status strip reads the device's connection and the playback state.

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
file in the array folder (ADR 020). Each stack declares its base screen as the
`anchor` in `unstable_settings` (not the deprecated `initialRouteName`): `index`
for Home, `explore/index` for Explore, `search` for Search and `library` for
Library. A cold deep link into a shared detail route is kept across the session gate (`auth.md`) and
opens in the Home tab over `index`; one into a tab's own route opens over that tab's base
screen. Back returns to the base screen.

## i18n namespace

`tabs`: `home`, `explore`, `search`, `library`; `common:connection.offline` and `player:strip.*` for the status strip.

## Checked by hand

The native tab bar with Liquid Glass, its SF Symbols and VoiceOver labels on
iOS 26+, the floating pill above the safe area on older iOS, and on Android
the docked bar, its fade, the mini player inside it and a TalkBack pass on the
tabs.

Issue 163, on a device: the iOS 26+ overlay above the native accessory and tab bar (regular and inline placement, and when the bar minimizes); the strip inside the Android docked bar's fade, above the mini player, with the fade still ending at the tab row; the strip appearing and leaving with airplane mode and with Wi-Fi without internet; VoiceOver and TalkBack announcing it. Visual, judged by the owner on the phone.
