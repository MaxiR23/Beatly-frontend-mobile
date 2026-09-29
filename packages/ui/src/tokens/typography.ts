// INFO: typography tokens, by role rather than by size. Every role uses
// the platform's system font, so none of them sets fontFamily. maxFontScale
// caps accessibility scaling app-wide.
export const typography = {
  display: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  title: { fontSize: 20, fontWeight: "700", lineHeight: 26 },
  section: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  subtitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  rowTitle: { fontSize: 14, fontWeight: "600", lineHeight: 19 },
  body: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  meta: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  button: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
} as const;

export const maxFontScale = 1.3;
