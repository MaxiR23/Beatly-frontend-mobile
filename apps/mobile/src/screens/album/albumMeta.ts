// INFO: the album's meta line: the kind, the year, the song count and the duration in hours and minutes, each omitted when the API sends none.
import type { Album } from "@beatly/core";

import type { useT } from "../../adapters/i18n.ts";

type AlbumT = ReturnType<typeof useT<"album">>;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export function albumMeta(album: Album, t: AlbumT): string {
  const parts = [t("kind")];
  if (album.year !== null) parts.push(album.year);
  if (album.track_count !== null) parts.push(t("songs", { count: album.track_count }));
  const hours = Math.floor(album.duration_seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((album.duration_seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  parts.push(
    hours > 0 ? t("durationHours", { hours, minutes }) : t("durationMinutes", { minutes }),
  );
  return parts.join(t("metaSeparator"));
}
