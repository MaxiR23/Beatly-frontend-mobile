// INFO: formats a duration in seconds as m:ss, or h:mm:ss from one hour; numbers only, so nothing to translate.
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  if (h > 0) return `${String(h)}:${String(m).padStart(2, "0")}:${s}`;
  return `${String(m)}:${s}`;
}
