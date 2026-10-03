# 023. Native track menu behind a single ui importer

How the three-dots button of a track opens its menu.

## Context

Every track row, the player header and the up next and related rows get a more button. On iOS the
platform expects a system menu; on Android a bottom sheet is the norm. The iOS menu is SwiftUI, so
a React Native library has to draw it. `@expo/ui` ships it (`Host`, `Menu`, `Button`), is an Expo SDK
package and is already in the dependency tree through `expo-router`. Like `react-native-image-colors`
(ADR 019), its entry needs a native module, which Expo Go may not have.

## Decision

- `@expo/ui` is a direct dependency of `apps/mobile` and a peer and dev dependency of `packages/ui`,
  pinned like the other Expo packages.
- It follows the pattern of the other libraries that draw UI (ADR 017): a single importer in
  `packages/ui`, `components/NativeMenu.tsx`, enforced in `eslint.config.js`. Apps and every other
  `ui` file are forbidden from importing it.
- Loading follows ADR 019: `isNativeMenuAvailable()` checks `Platform.OS === "ios"` and
  `requireOptionalNativeModule("ExpoUI")`, and only then does the component load the library with a
  lazy `require`. Where the module is missing the caller draws its own sheet, the same one Android uses.
- `expo` itself (for `requireOptionalNativeModule`) is a peer dependency of `packages/ui`, because
  `NativeMenu.tsx` probes the module with it. Unlike `@expo/ui` it has no single-importer rule: it is
  the Expo SDK core, not a library that draws UI, so the `ui` lint blocks restrict `expo-*` and leave
  `expo` open. Today only `NativeMenu.tsx` imports it; a second importer is not blocked by lint.
- The menu items map `IconName` to an SF Symbol. This is the second exception to "icons through
  `Icon`", after the native tab bar (ADR 017): the system menu draws SF Symbols.
- The Android and fallback menu is a `Sheet` of `ActionRow`s, owned by the screen's `TrackMenuHost`.
- Rejected: `@react-native-menu/menu` (a third-party native module that is never in Expo Go); `zeego`
  (two dependencies); `ContextMenu` (opens on long press, not on tap).

## Consequences

- The native branch cannot be tested without a device: the tests fake `@expo/ui` at the module and
  report the `ExpoUI` module as missing in every screen test, so they take the sheet.
- A development build that did not link `ExpoUI` needs a rebuild; until then the fallback sheet shows.
- `TrackMenuHost` mounts the menu, the picker and the credits sheets only while open, each with
  `visible` fixed to true, instead of keeping them mounted and toggling `visible` like
  `CreatePlaylistSheet` and `AccountButton`. The picker and credits bodies run their queries only
  while mounted, and every open starts from fresh state. Closing unmounts the `Modal`, and going from
  the menu to the picker swaps one `Modal` for another in a single commit.
- Each visible row on iOS mounts a SwiftUI host; long lists rely on virtualization.
