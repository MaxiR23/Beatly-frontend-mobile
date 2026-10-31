// INFO: the rules of the onboarding's pick: the order of the picked artists, which pick is asked for its similar artists next, and the ids it excludes, the 20 limit, how the bottom button reads for a count, and how many photos the welcome shows.
import { MAX_ONBOARDING_ARTISTS, MIN_ONBOARDING_ARTISTS } from "@beatly/core";
import type { ImageTiers } from "@beatly/core";

export interface PickedArtist {
  readonly id: string;
  readonly name: string;
  readonly image: ImageTiers | null;
}

// The answer of POST /onboarding/similar for one picked artist: what it returned, or that it failed (no row either way when empty or failed).
export type SimilarAnswer =
  | { readonly id: string; readonly kind: "artists"; readonly artists: readonly PickedArtist[] }
  | { readonly id: string; readonly kind: "failed" };

// The next picked artist to ask for: the first of `expanded` (pick order) with no answer yet; null when all are answered.
export function nextSimilarRequest(
  expanded: readonly string[],
  answers: readonly SimilarAnswer[],
): string | null {
  return expanded.find((id) => !answers.some((answer) => answer.id === id)) ?? null;
}

// exclude_ids: every id on screen, in this order and each once (the route rejects a repeat): the curated artists loaded, the search result, the picked artists, the artists of every similar answer.
export function similarExcludeIds(input: {
  readonly curated: readonly { readonly id: string }[];
  readonly found: { readonly id: string } | null;
  readonly picked: readonly PickedArtist[];
  readonly answers: readonly SimilarAnswer[];
}): string[] {
  const ids = [
    ...input.curated.map((artist) => artist.id),
    ...(input.found ? [input.found.id] : []),
    ...input.picked.map((artist) => artist.id),
    ...input.answers.flatMap((answer) =>
      answer.kind === "artists" ? answer.artists.map((artist) => artist.id) : [],
    ),
  ];
  return [...new Set(ids)];
}

// The photos of the welcome: the first five picked, in the order they were picked.
export const WELCOME_PHOTOS = 5;

// Adds the artist at the end, or removes it; at MAX_ONBOARDING_ARTISTS an unpicked artist is not added.
export function togglePick(
  picked: readonly PickedArtist[],
  artist: PickedArtist,
): readonly PickedArtist[] {
  if (picked.some((item) => item.id === artist.id)) {
    return picked.filter((item) => item.id !== artist.id);
  }
  if (picked.length >= MAX_ONBOARDING_ARTISTS) return picked;
  return [...picked, artist];
}

// The bottom button: disabled with how many are missing below MIN_ONBOARDING_ARTISTS, enabled with the count from it.
export function pickButton(
  count: number,
): { kind: "more"; n: number } | { kind: "continue"; n: number } {
  return count < MIN_ONBOARDING_ARTISTS
    ? { kind: "more", n: MIN_ONBOARDING_ARTISTS - count }
    : { kind: "continue", n: count };
}
