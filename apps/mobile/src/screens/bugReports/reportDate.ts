// INFO: the Date of a report's created_at for the list, or null when it cannot be read; fractional seconds beyond milliseconds are cut first, since the database sends microseconds and not every engine parses them.
export function reportDate(iso: string): Date | null {
  const date = new Date(iso.replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(date.getTime()) ? null : date;
}
