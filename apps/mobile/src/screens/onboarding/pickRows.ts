// INFO: the layout of the onboarding's grid: rows of three of the drawn artists, and after the row where an expanded artist appears, a row of its similar artists, as returned, once per artist; layout of already loaded items, no ranking or deduplication.
import type { PickedArtist } from "./onboardingRules.ts";

export interface ArtistRow {
  readonly key: string;
  readonly related: boolean;
  readonly artists: readonly PickedArtist[];
}

const ROW_SIZE = 3;

// After the first row where an expanded artist appears, a row of its similar artists, as returned, once per artist, the related rows walked the same way.
export function pickRows(
  base: readonly PickedArtist[],
  expanded: ReadonlySet<string>,
  relatedOf: (id: string) => readonly PickedArtist[] | undefined,
): ArtistRow[] {
  const rows: ArtistRow[] = [];
  const emitted = new Set<string>();

  const emit = (row: ArtistRow): void => {
    rows.push(row);
    for (const artist of row.artists) {
      if (!expanded.has(artist.id) || emitted.has(artist.id)) continue;
      const related = relatedOf(artist.id);
      if (related === undefined || related.length === 0) continue;
      emitted.add(artist.id);
      emit({
        key: `related:${artist.id}`,
        related: true,
        artists: related,
      });
    }
  };

  for (let start = 0; start < base.length; start += ROW_SIZE) {
    const artists = base.slice(start, start + ROW_SIZE);
    const first = artists[0];
    if (first === undefined) continue;
    emit({ key: `base:${first.id}`, related: false, artists });
  }
  return rows;
}
