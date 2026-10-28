// INFO: icon tokens: the size scale and the stroke width every icon draws
// with. The Icon component (components/Icon.tsx) draws with them.
export const icon = {
  size: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    // The leading icon of an ActionRow on Android (the owner's mockup; Material 3 says 24).
    actionRowAndroid: 22,
    hero: 64,
  },
  stroke: 2,
} as const;
