// INFO: spacing tokens, a multiples-of-four scale, plus the layout
// constants (gutter, gap, hitSlop, control height, and the carousel card,
// avatar, tab item, chip, genre bar and row cover sizes).
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
  tabItemWidth: 64,
  chipHeight: 36,
  genreBarWidth: 6,
  genreBarHeight: 28,
  rowCover: 40,
  rowCoverLarge: 64,
} as const;
