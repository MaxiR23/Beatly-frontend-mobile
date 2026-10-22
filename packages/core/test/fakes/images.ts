// INFO: fixture of the image tiers of one picture: three ready test URLs, one per tier, named after the picture.
import type { ImageTiers } from "../../src/domain/image.ts";

export function tiers(name: string): ImageTiers {
  return {
    small: `test://img/${name}/s`,
    medium: `test://img/${name}/m`,
    large: `test://img/${name}/l`,
  };
}
