// INFO: the only importer of i18next and expo-localization. It has no port
// because core never translates; screens read text through useT.
import { getLocales } from "expo-localization";
import i18next, { type TFunction } from "i18next";

import { fallbackLanguage, resolveLanguage, supportedLanguages } from "../i18n/language.ts";
import { resources, type Namespace } from "../i18n/resources.ts";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof resources)["en"];
  }
}

export const i18n = i18next.createInstance();

// Init with bundled in-memory resources and no backend plugin does no I/O,
// so it cannot reject; there is nothing to catch.
void i18n.init({
  resources,
  lng: resolveLanguage(getLocales().at(0)?.languageCode),
  fallbackLng: fallbackLanguage,
  supportedLngs: [...supportedLanguages],
  ns: ["common", "showcase"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  initAsync: false,
});

export function useT<N extends Namespace>(ns: N): TFunction<N> {
  return i18n.getFixedT(null, ns);
}
