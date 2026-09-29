// INFO: the bundled translations, one namespace per screen plus common for
// the states every screen draws (ADR 009). Bundled, so init is synchronous.
import enAuthCallback from "./en/authCallback.json";
import enCommon from "./en/common.json";
import enHome from "./en/home.json";
import enLogin from "./en/login.json";
import enSignUp from "./en/signUp.json";
import esAuthCallback from "./es/authCallback.json";
import esCommon from "./es/common.json";
import esHome from "./es/home.json";
import esLogin from "./es/login.json";
import esSignUp from "./es/signUp.json";

export const resources = {
  es: {
    common: esCommon,
    login: esLogin,
    signUp: esSignUp,
    authCallback: esAuthCallback,
    home: esHome,
  },
  en: {
    common: enCommon,
    login: enLogin,
    signUp: enSignUp,
    authCallback: enAuthCallback,
    home: enHome,
  },
} as const;

export type Namespace = keyof (typeof resources)["en"];
