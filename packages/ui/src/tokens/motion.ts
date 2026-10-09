// INFO: motion tokens: the duration scale, the one spring used app-wide, the opacity a pressed control drops to, the scale a paused player cover drops to, the scale the player drops to behind the open sheet, the scale a control enters from, the now playing bars' fall, loop periods and static heights, the points the sheet handle rises when it nudges, the thresholds of the vertical drag (the player's close, the sheet's open and close), the speed and rest of a scrolling title, and how long a brief notice stays.
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
  // Scale a control starts from when it enters (the detail play button becoming pause).
  enterScale: 0.8,
  // Points the sheet handle rises when it nudges.
  handleNudge: 6,
  marquee: {
    // Points per second a title that does not fit scrolls.
    speed: 30,
    // Milliseconds the title rests at each end.
    pause: 2000,
  },
  nowPlaying: {
    // Lowest a bar falls to, as a share of its height.
    minScale: 0.3,
    // Milliseconds each bar takes to rise or to fall; different, so the bars never move together.
    durations: [400, 550, 325],
    // Each bar's height while static under reduce motion.
    staticScales: [0.6, 1, 0.45],
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
