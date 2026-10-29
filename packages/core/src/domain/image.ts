// INFO: the image tiers of conventions.md, "Image tiers": the same picture in three square sizes, small, medium and large, as ready URLs; image is null when the picture is, a mosaic is the tiers of each element of its legacy list, in the same order; color is the backend's dominant color of the picture, a lowercase #rrggbb already adjusted to the dark theme, null until computed (conventions.md, Color), optional and nullable.
import { z } from "zod";

export const imageTiersSchema = z.object({
  small: z.string(),
  medium: z.string(),
  large: z.string(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/)
    .nullish(),
});
export type ImageTiers = z.infer<typeof imageTiersSchema>;
