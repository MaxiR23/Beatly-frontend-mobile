// INFO: picks the app language from the device's language code: es or en,
// anything else falls back to en. No library import, so it is unit tested.
export const supportedLanguages = ["es", "en"] as const;

export type Language = (typeof supportedLanguages)[number];

export const fallbackLanguage: Language = "en";

export function resolveLanguage(code: string | null | undefined): Language {
  const normalized = code?.toLowerCase();
  if (normalized === "es") return "es";
  if (normalized === "en") return "en";
  return fallbackLanguage;
}
