// INFO: decorative palettes. Product content, not derived colors: the
// genre and avatar gradients are migrated from the legacy inventory as
// they are, keyed by the same slugs/order. Weekly replay palettes are out
// of scope for this change.
export const genrePalette = {
  "dance-electronic": ["#00BCD4", "#00E5FF", "#006064"],
  decades: ["#BF953F", "#D4AF37", "#8E6F2E"],
  "hip-hop": ["#F57C00", "#FF9800", "#E65100"],
  "indie-alternative": ["#558B2F", "#7CB342", "#33691E"],
  jazz: ["#1A237E", "#3949AB", "#0D1545"],
  pop: ["#E84393", "#FD79A8", "#C2185B"],
  "rnb-soul": ["#7B1FA2", "#AB47BC", "#4A148C"],
  rock: ["#B71C1C", "#E53935", "#7F0000"],
  tropical: ["#00897B", "#26A69A", "#004D40"],
  urbano: ["#4A148C", "#7C4DFF", "#311B92"],
  fallback: ["#37474F", "#546E7A", "#263238"],
} as const;

export const avatarPalette = [
  ["#ff9966", "#ff5e62"],
  ["#36D1DC", "#5B86E5"],
  ["#a18cd1", "#fbc2eb"],
  ["#7F00FF", "#E100FF"],
  ["#00c6ff", "#0072ff"],
  ["#11998e", "#38ef7d"],
  ["#f7971e", "#ffd200"],
  ["#fc5c7d", "#6a82fb"],
] as const;
