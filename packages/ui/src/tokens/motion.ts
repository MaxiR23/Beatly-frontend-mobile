// INFO: motion tokens: the duration scale, the one spring used app-wide, the opacity a pressed control drops to, the scale a paused player cover drops to, the scale the player drops to behind the open sheet, the scale a control enters from, the detail play button's fade, shrink and scale-in durations, the now playing bars' fall, loop periods and static heights, the points the sheet handle rises in each bounce of its nudge, the thresholds of the vertical drag (the player's close, the sheet's open and close), the speed and rest of a scrolling title, the edge zone and speed of a reorder list's auto-scroll, the scroll each detail header layer takes to fade, the scale the hero cover shrinks to, the share of a fade the top bar leads by, the detail entry cascade's duration, stagger, offset, first row step and post-navigation delay, how long a brief notice stays and how long a picture loaded from the network fades in.
export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    shimmer: 1200,
    // How long a brief notice stays.
    notice: 2500,
    // Milliseconds a picture loaded from the network fades in on Android only (Picture); iOS and a memory or disk hit draw at once.
    imageFade: 300,
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
  // The detail play button's tap: the label fades, then the pill shrinks to the circle, then pause scales in (ms).
  playButton: {
    labelFade: 120,
    shrink: 340,
    scaleIn: 280,
  },
  // Points the sheet handle rises in the first and the second bounce of its nudge.
  handleNudge: { first: 9, second: 5 },
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
  reorder: {
    // Points from the top or bottom of a reorder list where a held row starts the auto-scroll.
    edge: 64,
    // Points per second a reorder list auto-scrolls while a row is held at its edge.
    speed: 800,
  },
  detailCollapse: {
    // Points of scroll each layer of the detail header takes to fade (floating buttons, title, top bar).
    fade: 40,
    // Scale the detail hero cover shrinks to as it scrolls away.
    coverScale: 0.42,
    // Share of a fade the top bar starts before the title is fully under it.
    // Must stay <= 1: above 1 the bar and the floating buttons would both take touches at once.
    barLead: 0.5,
  },
  detailCascade: {
    // Milliseconds each block of a detail screen takes to enter (opacity 0 and offset lower, to rest).
    duration: 300,
    // Milliseconds between the starts of two consecutive blocks (hero, title, children, first rows, later rows).
    stagger: 60,
    // Points lower than its place a block starts from.
    offset: 12,
    // Rows that enter in the first row step; the rows drawn after them enter in the next.
    firstRows: 3,
    // Milliseconds the cascade waits when the content is ready at mount, so it starts after the navigation transition.
    // A fixed estimate of the native push, not tied to the transition's end; tune on device.
    navigationDelay: 350,
  },
} as const;
