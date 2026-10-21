// INFO: blur tokens, one per blurred surface. intensity is the blur library's 0-100 scale (on iOS
// the share of the system blur effect applied), not points; tint is the system material it uses.
// Tuned on the phone.
export const blur = {
  // The content under the iOS detail strip: about 4 points of blur.
  detailStrip: { intensity: 15, tint: "dark" },
} as const;
