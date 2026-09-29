// INFO: ADR 005's single default max-age: a response without a usable Cache-Control is stale.
export const DEFAULT_MAX_AGE_SECONDS = 0;

export function parseMaxAge(header: string | undefined): number {
  if (header === undefined) return DEFAULT_MAX_AGE_SECONDS;
  const directives = header
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part !== "");
  if (directives.includes("no-store") || directives.includes("no-cache")) {
    return DEFAULT_MAX_AGE_SECONDS;
  }
  for (const directive of directives) {
    const match = /^max-age=(\d+)$/.exec(directive);
    if (match?.[1] !== undefined) return Number.parseInt(match[1], 10);
  }
  return DEFAULT_MAX_AGE_SECONDS;
}
