# 031. Window insets from a root context

## Context

A `Sheet` is a `Modal` presented over the whole window, so it must keep clear of the window's edges and
never of a tab's bar. On iOS 26 and later, expo-router's native tabs wrap each tab's content in its own
safe-area provider, whose bottom inset includes the tab bar (83 = 34 home indicator + 49 tab bar). Every
`Sheet` caller inside a tab received that value, so the floating sheet ended 49 pt above where it should,
inside a `Modal` that already covers the bar. The floating tab bar's clearance had the same defect: it
draws the bar itself, so a native tab's inset counted the bar twice. JS tabs (Android, iOS before 26) do
not nest a provider, so they were never affected.

The same issue changed the iOS shape of the `Sheet`. It was a floating glass card `layout.gutter` from the
window's edges; the owner chose the shape of the system sheet (UISheetPresentationController): attached to
the bottom and side edges, rounded on top only, its background behind the home indicator.

## Decision

- `WindowInsetsProvider` (in `apps/mobile/src/providers/`) is mounted once in `app/_layout.tsx`, above the
  navigators. It captures the insets of the root safe-area provider, which measures the window.
  `useWindowInsets()` returns them.
- Surfaces that cover the whole window (every `Sheet` caller) and the floating bar's clearance
  (`useTabBarClearance`) read `useWindowInsets()`.
- Readers that draw inside a tab, or that mirror a native view's own inset (the iOS edit list's spacer),
  stay on `useSafeAreaInsets()`. So do screens outside the tabs (the player route), where the two values
  are equal.
- `useWindowInsets()` throws outside its provider, like `useCore` and `useTrackMenu`. A silent fallback to
  the nearest insets would reproduce this defect if the root wiring were lost; a throw makes every route
  test fail.
- On iOS the `Sheet` is a `GlassSurface` `sheet` attached to the bottom and side edges, full width, with the
  Android sheet's values (ADR 027): `radius.xl` top corners, `spacing.xl` padding, `spacing.lg` between the
  parts, the content the window's bottom inset plus `spacing.xl` above the bottom edge. Its top limit stays
  the top inset plus `layout.gutter`. The glass and the backdrop over the whole window stay; iOS has no
  drag handle.
- On both platforms the `Sheet` opens and closes like the system sheet (and the Material 3 scrim): the backdrop
  fades in and out in place and only the sheet slides up from the bottom edge and back down, with `Animated` on
  the native driver (`motion.duration.slow` and `motion.easing.enter` to open, `motion.duration.base` and
  `motion.easing.exit` to close). The `Modal` has no animation (`animationType: "none"`), because its slide moved
  the backdrop with the sheet. The `Modal` stays up until the close ends and then calls `onClosed`, so the callers
  that mount a sheet on open keep it mounted through its close (`useSheetPresence`), and a sheet opened from
  another waits for that one to close, never presenting two `Modal`s at once. Under reduce motion both appear and
  disappear at once.
- Rejected:
  - A native `formSheet`: it is a route presentation, so the state-driven sheets would become routes, and it
    falls back to a modal on Android.
  - A safe-area provider inside `Sheet`: `packages/ui` has no importer of the safe-area library, and each
    library there has one named importer by ADR, so it would need a new ADR and lint block for a value the
    app already has.
  - `initialWindowMetrics`: a launch-time constant that does not follow changes.
  - Keeping the `Modal`'s `slide` or `fade`: either moves or fades the backdrop and the sheet together.
  - Animating only the closes the `Sheet` starts (backdrop, back, drag): 9 of the 11 sheets close by being
    unmounted, so every action that closes a sheet would make it vanish at once.

## Consequences

- On iOS the sheet's background reaches the bottom edge and its content sits the window's bottom inset plus
  `spacing.xl` above it (34 + 24 inside a native tab, not 83 + 24). Android is unchanged.
- A new full-window surface reads `useWindowInsets()`; a reader inside a tab keeps `useSafeAreaInsets()`.
- jest cannot run UIKit's tab controller, so the native-tab value is checked by hand on a device, and tests
  pin the source of the insets in each caller and fail if the iOS sheet gets a bottom or side padding or
  margin again.
- A closed sheet unmounts one close animation later (`motion.duration.base`); tests wait for it (`waitFor`,
  `findBy*`) or hold the timings (`holdSheetMotion`).
- The `Modal` stays up `motion.duration.base` after every close and blocks the screen below, and the sheet and
  its backdrop take no touches meanwhile (`pointerEvents` follows `visible`, and the system back does nothing),
  so a row cannot fire twice; a navigation or `Alert` fired in the same handler as `hide()` runs at once.
- A host keeps its sheet mounted until `onClosed`: a render condition that turns false mid-close (`own !== null`
  in `PlaylistScreen`, `data` in `ProfileScreen`) leaves `useSheetPresence` with a `current` that never clears,
  and every later `show` waits forever.
- A hook shared across screens lives in the folder of its main user, as `useSheetPresence` in
  `screens/trackMenu/` and `useReduceMotion` / `useTabBarClearance` in `screens/player/`, since there is no shared
  hooks folder.
