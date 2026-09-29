// INFO: the genre bar's gradient: the palette entry of a genre slug, or the fallback for a slug without one.
import { genrePalette } from "../tokens/palette.ts";

function isPaletteSlug(slug: string): slug is keyof typeof genrePalette {
  return Object.hasOwn(genrePalette, slug);
}

export function genreGradient(slug: string) {
  return isPaletteSlug(slug) ? genrePalette[slug] : genrePalette.fallback;
}
