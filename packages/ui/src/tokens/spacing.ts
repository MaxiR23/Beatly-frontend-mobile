// INFO: spacing tokens, a multiples-of-four scale, plus the layout
// constants (gutter, gap, hitSlop, control height, and the carousel card,
// avatar, creator mark, tab item, chip, genre bar, row cover, detail hero cover and
// track-number column sizes, and the skeleton bar widths).
export const spacing = {
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
  carouselCard: 140,
  avatar: 36,
  creatorMark: 24,
  tabItemWidth: 64,
  chipHeight: 36,
  genreBarWidth: 6,
  genreBarHeight: 28,
  rowCover: 40,
  rowCoverMedium: 56,
  rowCoverLarge: 64,
  heroCover: 240,
  heroImageRatio: 1,
  trackNumber: 24,
  // Widths of the detail skeleton's placeholder bars, as a share of their row.
  skeletonBar: { title: "70%", meta: "45%", rowTitle: "60%", rowMeta: "35%" },
} as const;
