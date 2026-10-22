// INFO: the image tiers of conventions.md, "Image tiers": the same picture in three square sizes, small, medium and large, as ready URLs; image is null when the picture is, a mosaic is the tiers of each element of its legacy list, in the same order.
import { z } from "zod";

export const imageTiersSchema = z.object({
  small: z.string(),
  medium: z.string(),
  large: z.string(),
});
export type ImageTiers = z.infer<typeof imageTiersSchema>;
