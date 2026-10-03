// INFO: motion tokens: the duration scale, the one spring used app-wide, the opacity a pressed control drops to, the scale a paused player cover drops to, the scale the player drops to behind the open sheet, the points the sheet handle rises when it nudges, the thresholds of the vertical drag (the player's close, the sheet's open and close), the speed and rest of a scrolling title, and how long a brief notice stays.
export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    shimmer: 1200,
    // How long a brief notice stays.
    notice: 2500,
  },
  spring: {
    damping: 18,
    stiffness: 180,
  },
  pressOpacity: 0.7,
  // Scale the player cover drops to while paused.
  pausedScale: 0.9,
  // Scale the player drops to behind the open sheet.
  behindSheetScale: 0.94,
  // Points the sheet handle rises when it nudges.
  handleNudge: 6,
  marquee: {
    // Points per second a title that does not fit scrolls.
    speed: 30,
    // Milliseconds the title rests at each end.
    pause: 2000,
  },
  dragToClose: {
    // Travel, in points, before a vertical drag is taken (the player's close, the sheet's open and close).
    slop: 8,
    // Share of the window height a released vertical drag must pass to commit.
    distanceShare: 0.25,
    // Speed, in points per millisecond, that commits a vertical drag on release.
    velocity: 0.5,
  },
} as const;
