// INFO: color tokens. Surface levels (and the inverse surface of the Android snackbar), text levels, the white accent, the
// semantic error/success colors, and the black/white overlays used over
// images and controls, the clear start of a fade, the sheet handle bar on Android, the press ripple on Android over a dark fill and over the accent, and the opacity stops of the iOS detail strip's wash and shade and of the mask of its blur, and the shape, intensity and stops of the detail hero's wash. Values are the legacy inventory's, named by role.
// The detail hero's wash: the shape of its opacity curve, from the hero's top (offset 0) to
// layout.heroWashExtension under its bottom edge (offset 1), scaled by its intensity. Tune the intensity only.
// Decision: a token may be computed from other tokens of this file when it is a curve tuned by one value
// (shape times intensity); stops below derives from the two, so only the intensity is edited.
const detailHeroShape = [
  { offset: 0, opacity: 1 },
  { offset: 0.2, opacity: 0.92 },
  { offset: 0.4, opacity: 0.74 },
  { offset: 0.6, opacity: 0.48 },
  { offset: 0.75, opacity: 0.27 },
  { offset: 0.88, opacity: 0.11 },
  { offset: 1, opacity: 0 },
] as const;
const detailHeroIntensity = 0.7;

export const color = {
  surface: {
    base: "#0e0e0e",
    raised: "#161616",
    card: "#1a1a1a",
    control: "#1e1e1e",
    border: "#2a2a2a",
    // Material 3 inverse surface: the Android snackbar's light fill on the dark theme (the neutral at tone 90).
    inverse: "#e2e2e2",
  },
  text: {
    primary: "#ffffff",
    secondary: "#aaaaaa",
    tertiary: "#888888",
    disabled: "#555555",
    inverse: "#000000",
  },
  accent: {
    primary: "#ffffff",
  },
  status: {
    error: "#ff6b6b",
    success: "#4ade80",
  },
  overlay: {
    backdrop: "rgba(0, 0, 0, 0.6)",
    onImage: "rgba(0, 0, 0, 0.4)",
    subtle: "rgba(255, 255, 255, 0.08)",
    muted: "rgba(255, 255, 255, 0.15)",
    // The sheet handle bar on Android.
    handleAndroid: "rgba(255, 255, 255, 0.45)",
    // The press ripple on Android (Material 3 state layer: the content color at 10%): over every fill but the accent, and over the white accent.
    ripple: "rgba(255, 255, 255, 0.1)",
    rippleOnAccent: "rgba(0, 0, 0, 0.1)",
    // INFO: surface.base at zero alpha; the two must change together.
    clear: "rgba(14, 14, 14, 0)",
  },
  gradient: {
    // The iOS detail strip: opacity stops of its wash (the dominant color, or surface.base without
    // one) and of the surface.base shade over it; both end at 0 so the list passes under with no edge.
    detailStrip: {
      wash: [
        { offset: 0, opacity: 1 },
        { offset: 0.4, opacity: 0.9 },
        { offset: 0.68, opacity: 0.62 },
        { offset: 0.88, opacity: 0.28 },
        { offset: 1, opacity: 0 },
      ],
      shade: [
        { offset: 0, opacity: 0 },
        { offset: 0.7, opacity: 0.25 },
        { offset: 1, opacity: 0 },
      ],
      // The mask of the blur under the strip: opaque to 55% of its height, transparent at the bottom edge.
      blurMask: [
        { offset: 0, opacity: 1 },
        { offset: 0.55, opacity: 1 },
        { offset: 1, opacity: 0 },
      ],
    },
    // The detail hero's wash (album, playlist): the dominant color over surface.base at the shape's
    // opacities times the intensity (0: 0.70, 0.2: 0.644, 0.4: 0.518, 0.6: 0.336, 0.75: 0.189, 0.88: 0.077, 1: 0).
    detailHero: {
      shape: detailHeroShape,
      intensity: detailHeroIntensity,
      stops: detailHeroShape.map(({ offset, opacity }) => ({
        offset,
        opacity: opacity * detailHeroIntensity,
      })),
    },
  },
} as const;
