# 025. SwiftUI edit list through a single Expo UI loader

Supersedes in part ADR 023: the file that imports `@expo/ui`.

## Context

The edit mode of a playlist's tracks (issue #71) needs SwiftUI's `List` in edit mode on iOS, with the
system drag handles and delete: a second `@expo/ui` component. ADR 023 named the component file
`NativeMenu.tsx` as the single importer of the library, and no `ui` component file exports more than
one component, so the second list cannot live there.

## Decision

- The single importer of `@expo/ui` is `packages/ui/src/components/swiftUI.ts`, a loader with
  `isSwiftUIAvailable()` and `loadSwiftUI()`. `NativeMenu` and `NativeEditList` draw through it and
  never import `@expo/ui`. `eslint.config.js` enforces it, as it did for `NativeMenu.tsx`.
- Loading still follows ADR 019 and ADR 023: the probe checks `Platform.OS === "ios"` and
  `requireOptionalNativeModule("ExpoUI")`, and only then does the loader `require` the library lazily.
- `NativeEditList` rows are SwiftUI text (title and artists) without a cover, because the SwiftUI
  `Image` of `@expo/ui` cannot draw a remote URL.
- Where the module is missing, iOS takes the same `ReorderList` Android uses.
- Rejected: a second component in `NativeMenu.tsx` (every `ui` component file exports one component);
  a second allowed importer (two files to keep in sync, the point of the rule lost); hosting React
  Native rows inside SwiftUI with `RNHostView` (one React Native host per row of a list of hundreds).

## Consequences

- The native branch is tested with `@expo/ui` faked at the module, like ADR 023.
- The list's look and its VoiceOver behaviour are checked on a device.
- `NativeMenu` keeps its behaviour and its test; only how it loads the library changed.
