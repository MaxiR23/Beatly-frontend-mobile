// INFO: the avatar's initials and gradient, derived from a name; the hash
// is the legacy one so a user keeps their color.
import { avatarPalette } from "../tokens/palette.ts";

export function initialsOf(name: string | null): string {
  if (name === null) return "";
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "");
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarGradient(name: string | null) {
  return avatarPalette[hash(name ?? "") % avatarPalette.length] ?? avatarPalette[0];
}
