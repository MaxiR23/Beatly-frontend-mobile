// INFO: an album's artists line: the artists' names in order, joined with the album separator.
import type { useT } from "../../adapters/i18n.ts";

type AlbumT = ReturnType<typeof useT<"album">>;

export function albumArtists(album: { artists: readonly { name: string }[] }, t: AlbumT): string {
  return album.artists.map((artist) => artist.name).join(t("artistSeparator"));
}
