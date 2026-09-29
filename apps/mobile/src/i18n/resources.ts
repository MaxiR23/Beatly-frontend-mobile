// INFO: the bundled translations, one namespace per screen plus common for
// the states every screen draws (ADR 009). Bundled, so init is synchronous.
import enCommon from "./en/common.json";
import enShowcase from "./en/showcase.json";
import esCommon from "./es/common.json";
import esShowcase from "./es/showcase.json";

export const resources = {
  es: { common: esCommon, showcase: esShowcase },
  en: { common: enCommon, showcase: enShowcase },
} as const;

export type Namespace = keyof (typeof resources)["en"];
