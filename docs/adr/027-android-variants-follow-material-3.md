# 027. Android variants follow Material 3

Why Android draws Material 3 instead of the iOS shapes, how a component decides
it is on Android, and in what order the Android variants land.

## Context

The app was designed once, on iOS shapes: a floating pill tab bar, floating
sheets, a horizontal ellipsis, a chevron back, opacity on press. Android draws
the same shapes, so it feels like an iOS app on Android. `017-native-tabs-and-glass-surfaces.md`
made that explicit for Android: "Android and older iOS draw `FloatingTabBar`,
the same pill shape", rejected native tabs on Android for "a different shape
from the design", and drew every floating surface (the bar, the sheet) with
`GlassSurface`. It also named `isGlassAvailable()` the single platform test,
but four files have since branched on `Platform.OS` on their own
(`DetailScreen`, `PullUpSheet`, `Sheet`, `PlayerScreen`). An inventory of what
Android draws like iOS (21 elements) found most of them differ from Material 3
(Material Design 3 by Google), the system's own design language.

## Decision

- On Android every UI element follows Material 3, with only brand adjustments:
  the colors, the single dark theme and the tokens of `packages/ui`. No shape
  or pattern on Android is taken from iOS.
- iOS does not change: iOS 26+ and older iOS keep what they draw today.
- This record supersedes the Android part of 017: the pill tab bar on Android,
  the rejection of a native-shaped bar on Android, and the floating sheet on
  Android. Until the issue of each element lands, Android keeps drawing what it
  draws today. 017 stays in force for iOS.
- One helper decides the Android branch: `isAndroidVariant()`, in
  `packages/ui/src/components/platform.ts`, exported from `@beatly/ui/native`
  next to `isGlassAvailable()`. It is read on every call. No component or
  screen reads `Platform.OS` to decide what to draw; the platform tests are
  `isAndroidVariant()` and `isGlassAvailable()` (native glass on iOS 26+).
  `Platform.OS` uses that do not decide UI (the core wiring, the device
  adapter, the SwiftUI module probe) are not covered by this rule.
- A variant is a branch inside the `ui` component (or the route) that draws the
  element, with the iOS branch left as it is.
- Icons whose glyph is a platform convention have a role name in `Icon`,
  resolved there: `back` (a chevron on iOS, Material's arrow_back on Android)
  and `more` (a horizontal ellipsis on iOS, Material's more_vert on Android),
  both from the current icon library.
- Work order, one issue per item, from the most visible and safest to the
  riskiest, without dates:

  0. This record and the platform helper.
  1. Android action icons: `more` and `back`.
  2. Ripple instead of opacity on press, a shared press helper in `ui` and a
     ripple color token (two: `color.overlay.ripple`, and
     `color.overlay.rippleOnAccent` for the white accent fill), across the pressable components.
  3. Notices as a snackbar: an inverse surface, extra-small corners, no pill.
  4. Material 3 filter chips: 32 tall, 8 corners, an outline and a check.
  5. Detail top bar: the title aligned to the start on Android.
  6. Material 3 modal bottom sheet: attached to the bottom edge, 28 top
     corners, a drag handle and the keyboard on Android. 6b: drag to close,
     a separate issue.
  7. Tabs instead of the segmented control in the player sheet.
  8. Outlined text fields with a floating label.
  9. A Material 3 switch drawn in `ui`.
  10. The Material3 native Android theme (dialogs), measured on a device
      first.
  11. A Material 3 navigation bar with the mini player resting on it.
  12. Predictive back, with its own record, tested with the player modal.
  13. The Material 3 type scale, together with the deferred row redesign,
      not before.

- Rejected: keeping the iOS shapes on Android (the app keeps feeling foreign
  there); a `.android.tsx` file per component (two files drift apart and
  the boundaries become per platform); a `Platform.OS` check in each file
  (the decision spreads and nothing names it); choosing the glyph at each call
  site (the same platform decision in every screen).

## Consequences

- A new Android branch calls `isAndroidVariant()`; a `Platform.OS` that decides
  UI is a review finding.
- Each work order item updates `DESIGN.md` and the `docs/features/` entries of
  the screens it changes, and each one is checked on an Android phone.
- Items 11 and 12 change decisions of their own (the tab bar, the back
  gesture) and get their own records before their issues.
- In tests the helper follows `Platform.OS`, which jest-expo sets to `ios`;
  a test that switches it to `android` restores it.
