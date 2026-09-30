// INFO: color tokens. Surface levels, text levels, the white accent, the
// semantic error/success colors, and the black/white overlays used over
// images and controls, and the clear start of a fade. Values are the legacy inventory's, named by role.
export const color = {
  surface: {
    base: "#0e0e0e",
    raised: "#161616",
    card: "#1a1a1a",
    control: "#1e1e1e",
    border: "#2a2a2a",
  },
  text: {
    primary: "#ffffff",
    secondary: "#aaaaaa",
    tertiary: "#888888",
    disabled: "#555555",
    inverse: "#000000",
  },
  accent: {
    primary: "#ffffff",
  },
  status: {
    error: "#ff6b6b",
    success: "#4ade80",
  },
  overlay: {
    backdrop: "rgba(0, 0, 0, 0.6)",
    onImage: "rgba(0, 0, 0, 0.4)",
    subtle: "rgba(255, 255, 255, 0.08)",
    muted: "rgba(255, 255, 255, 0.15)",
    // INFO: surface.base at zero alpha; the two must change together.
    clear: "rgba(14, 14, 14, 0)",
  },
} as const;
