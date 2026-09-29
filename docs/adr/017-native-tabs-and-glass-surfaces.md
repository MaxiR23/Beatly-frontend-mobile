# 017. Native tabs and glass surfaces

Why the tab bar is native on iOS 26+ and ours elsewhere, and why every
floating surface goes through one component.

## Context

The home issue adds a tab bar and a bottom sheet. iOS 26 has a system glass
material and a native tab bar that uses it; Android and older iOS have
neither. The design is one pill-shaped floating bar. `expo-glass-effect` draws
the system glass, and `expo-router` offers native tabs under an unstable path
until SDK 58 makes them stable.

## Decision

- On iOS 26+ the tab bar is the system one, through
  `expo-router/unstable-native-tabs`. It is a stable SDK's unstable API, not a
  beta SDK, so `003-expo-sdk-version-policy.md` holds.
- SF Symbols in that bar are the one exception to "icons through `Icon`".
- Android and older iOS draw `FloatingTabBar`, the same pill shape.
- Every floating surface (the bar, the sheet) is drawn with `GlassSurface` of
  `@beatly/ui`, the only importer of `expo-glass-effect`, enforced in
  `eslint.config.js` the way `Icon.tsx` is for the icon library. It draws
  native glass on iOS 26+ and a solid surface elsewhere.
- `isGlassAvailable()`, exported from `GlassSurface`, is the single platform
  test.
- Rejected: our bar everywhere (loses the system glass and behavior on iOS 26);
  native tabs on Android (a different shape from the design); a glass adapter
  in `apps/mobile` (a `ui` surface would then import the app).

## Consequences

- When SDK 58 lands, the upgrade PR moves the import off `unstable-`.
- The native branch is verified by hand only: the test renderer draws neither
  `NativeTabs` nor `GlassView`.
- In tests, `expo-glass-effect` is faked at the module so the fallback branch is
  the one that runs.
