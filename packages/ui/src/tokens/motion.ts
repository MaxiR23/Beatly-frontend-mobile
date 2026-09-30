// INFO: motion tokens: the duration scale, the one spring used app-wide, the opacity a pressed control drops to, the scale a paused player cover drops to, and the thresholds of the drag that closes the player.
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
  // Scale the player cover drops to while paused.
  pausedScale: 0.9,
  dragToClose: {
    // Downward travel, in points, before the player takes a drag from its content.
    slop: 8,
    // Share of the window height a released drag must pass to close the player.
    distanceShare: 0.25,
    // Downward speed, in points per millisecond, that closes the player on release.
    velocity: 0.5,
  },
} as const;
