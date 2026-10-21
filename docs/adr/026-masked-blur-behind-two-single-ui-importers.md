# 026. Masked blur behind two single UI importers

## Context

The iOS detail strip (#98) fades the content under it with color only. The owner wants a blur of about 4
points that fades to zero at the strip's bottom edge. `expo-blur`'s `BlurView` has one even `intensity`
and no gradient, so a fading blur needs a mask. The strip fades through its parent's opacity, and Apple
documents that a visual effect view renders wrong under an ancestor with alpha below 1.

## Decision

`expo-blur` and `@react-native-masked-view/masked-view` (already in the tree through `expo-router`)
become pinned direct dependencies of `apps/mobile` and peer and dev dependencies of `packages/ui`,
installed with `npx expo install`. Each has a single importer in `packages/ui`
(`components/BlurFill.tsx`, `components/AlphaMask.tsx`), enforced in `eslint.config.js`, following ADR 017. The blur is a sibling of the strip, never inside a view with an opacity; it appears by animating the
opacity of its mask, driven by the strip's own scroll value. It stays mounted on iOS while the body is
ready and the ranges are measured: its visibility comes only from the mask's opacity (0 at the top), never
from mounting it at a phase change (a late mount pops in after the strip on a fast flick) nor from a
parent's opacity. Its values are tokens (`blur.detailStrip`, `color.gradient.detailStrip.blurMask`).

Rejected: stacked bands of `BlurView` at decreasing intensity with no mask library (visible steps,
several blur views); the blur inside the strip (a blur under a fading parent); animating `intensity` (not
a style prop, so not on the native driver: the JS thread would drive a scroll-tied value); Android blur
(out of scope; Android has a solid bar).

## Consequences

- iOS only. The native branch is verified on the phone only: the test renderer draws neither the blur
  nor the mask.
- In tests the libraries render through their jest-expo and React Native mocks.
- A development build made before this change needs a rebuild to link the blur's native view.
- The intensity is a share of the system effect, not a radius, so "4 points" is tuned on the phone.
