// INFO: corner radius tokens, a short scale, from Material's extra-small to extra-large, plus the fully-round pill.
export const radius = {
  // Material 3 extra-small shape: the Android snackbar.
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  // Material 3 extra-large shape: the modal bottom sheet's top corners, on both platforms.
  xl: 28,
  full: 9999,
} as const;
