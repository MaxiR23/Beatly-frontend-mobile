// INFO: spacing tokens, a multiples-of-four scale (and an explicit zero), plus the layout
// constants (gutter, gap, hitSlop, control height, text area height, and the carousel card,
// avatar, creator mark, profile avatar, tab item, chip (and the Android chip), the Android tab indicator, the Android switch's track and thumb sizes, genre bar, row cover (and the Android track menu header cover), the Android action row height, detail hero cover,
// track-number column, now playing bar width, large and medium play button, the detail play pill's width, the side buttons' stacking value, seek bar and sheet handle sizes (iOS and Android) and the Android modal sheet handle zone and width, and the skeleton bar widths and row count).
export const spacing = {
  // An explicit zero gap where a native container would otherwise apply a system default.
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const layout = {
  gutter: 16,
  gap: 12,
  hitSlop: 8,
  controlHeight: 48,
  // Height of an ActionRow on Android (Material 3 one-line list item).
  actionRowHeightAndroid: 56,
  // Minimum height of a multiline form field.
  textAreaHeight: 120,
  carouselCard: 140,
  avatar: 36,
  creatorMark: 24,
  // Side of the large avatar of the profile screen.
  profileAvatar: 96,
  chipHeight: 36,
  // Height of a filter chip on Android (Material 3 filter chip).
  chipHeightAndroid: 32,
  // Height of the active indicator under the selected tab on Android (Material 3 primary tabs).
  tabIndicatorHeightAndroid: 3,
  // Width of the Android switch track (Material 3 switch).
  switchTrackWidthAndroid: 52,
  // Height of the Android switch track (Material 3 switch).
  switchTrackHeightAndroid: 32,
  // Side of the Android switch thumb when off (Material 3 switch).
  switchThumbOffAndroid: 16,
  // Side of the Android switch thumb when on (Material 3 switch).
  switchThumbOnAndroid: 24,
  // Side of the Android switch thumb while pressed (Material 3 switch).
  switchThumbPressedAndroid: 28,
  genreBarWidth: 6,
  genreBarHeight: 28,
  rowCover: 40,
  // Side of the track cover in the Android track menu sheet's header.
  rowCoverMenu: 48,
  rowCoverMedium: 56,
  rowCoverLarge: 64,
  heroCover: 240,
  // Width:height ratio of the full-width detail image hero.
  heroImageRatio: 1,
  // Most of the window height, as a share, the detail image hero may take.
  heroImageMaxHeightShare: 0.5,
  trackNumber: 24,
  // Width of one bar of the now playing indicator.
  nowPlayingBarWidth: 3,
  // Side of the large play or pause button of the player.
  playButton: 72,
  // Side of the detail play button's circle and height of its idle pill.
  playButtonMedium: 56,
  // Width of the detail play button's idle pill.
  playButtonPill: 164,
  // Stacking value of the detail action row's side buttons, above the play button's slot so their taps win where they slide over it.
  sideButtonStack: 1,
  // Height of the seek bar track, and the side of its thumb.
  seekTrack: 6,
  seekThumb: 14,
  // Width and height of the sheet handle bar.
  handleWidth: 36,
  handleHeight: 4,
  // Width and height of the sheet handle bar on Android.
  handleWidthAndroid: 48,
  handleHeightAndroid: 5,
  // Height of the handle zone (the drag zone) at the top of the Android modal sheet.
  modalHandleZoneAndroid: 36,
  // Width of the Android modal sheet's drag handle (Material 3).
  modalHandleWidthAndroid: 32,
  // Widths of a skeleton's placeholder bars, as a share of their row.
  skeletonBar: { title: "70%", meta: "45%", rowTitle: "60%", rowMeta: "35%" },
  // How many placeholder track rows a detail skeleton draws, on first load and under the list while its next page loads.
  skeletonRows: 6,
} as const;
