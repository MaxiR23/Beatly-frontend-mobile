// INFO: motion tokens: the duration scale, the one spring used app-wide,
// and the opacity a pressed control drops to.
export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    shimmer: 1200,
  },
  spring: {
    damping: 18,
    stiffness: 180,
  },
  pressOpacity: 0.7,
} as const;
