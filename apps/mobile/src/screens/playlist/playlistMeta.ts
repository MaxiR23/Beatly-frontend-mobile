// INFO: the playlist's meta line: the visibility when there is one, the song count and the duration in hours and minutes.
import type { useT } from "../../adapters/i18n.ts";

type PlaylistT = ReturnType<typeof useT<"playlist">>;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export function playlistMeta(
  input: { visibility: "private" | "public" | null; count: number; durationSeconds: number },
  t: PlaylistT,
): string {
  const parts: string[] = [];
  if (input.visibility !== null) parts.push(t(input.visibility));
  parts.push(t("songs", { count: input.count }));
  const hours = Math.floor(input.durationSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((input.durationSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  parts.push(
    hours > 0 ? t("durationHours", { hours, minutes }) : t("durationMinutes", { minutes }),
  );
  return parts.join(t("metaSeparator"));
}
