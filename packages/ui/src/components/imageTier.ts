// INFO: the image tier rule: the smallest tier the API serves whose side covers the drawn side at 3 pixels per point; the single place a tier is chosen.

export interface ImageTiers {
  readonly small: string;
  readonly medium: string;
  readonly large: string;
}

export type ImageTier = keyof ImageTiers;

// The side in pixels of the small and medium files the API serves (conventions.md, Image tiers); large, 1320, takes anything above medium.
const TIER_PIXELS = { small: 192, medium: 600 } as const;

// The densest phone screens draw 3 pixels per point; the rule sizes for them.
const PIXELS_PER_POINT = 3;

export function imageTier(points: number): ImageTier {
  const pixels = points * PIXELS_PER_POINT;
  return pixels <= TIER_PIXELS.small ? "small" : pixels <= TIER_PIXELS.medium ? "medium" : "large";
}

// Picks one of the three URLs; it never builds or edits one.
export function imageUri(image: ImageTiers, points: number): string {
  return image[imageTier(points)];
}
