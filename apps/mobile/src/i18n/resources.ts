// INFO: the bundled translations, one namespace per screen plus common for
// the states every screen draws (ADR 009). Bundled, so init is synchronous.
import enAlbum from "./en/album.json";
import enArtist from "./en/artist.json";
import enAuthCallback from "./en/authCallback.json";
import enCommon from "./en/common.json";
import enExplore from "./en/explore.json";
import enGenre from "./en/genre.json";
import enHome from "./en/home.json";
import enLibrary from "./en/library.json";
import enLogin from "./en/login.json";
import enPlaylist from "./en/playlist.json";
import enSearch from "./en/search.json";
import enSignUp from "./en/signUp.json";
import enTabs from "./en/tabs.json";
import esAlbum from "./es/album.json";
import esArtist from "./es/artist.json";
import esAuthCallback from "./es/authCallback.json";
import esCommon from "./es/common.json";
import esExplore from "./es/explore.json";
import esGenre from "./es/genre.json";
import esHome from "./es/home.json";
import esLibrary from "./es/library.json";
import esLogin from "./es/login.json";
import esPlaylist from "./es/playlist.json";
import esSearch from "./es/search.json";
import esSignUp from "./es/signUp.json";
import esTabs from "./es/tabs.json";

export const resources = {
  es: {
    common: esCommon,
    album: esAlbum,
    artist: esArtist,
    library: esLibrary,
    login: esLogin,
    signUp: esSignUp,
    authCallback: esAuthCallback,
    home: esHome,
    explore: esExplore,
    genre: esGenre,
    playlist: esPlaylist,
    search: esSearch,
    tabs: esTabs,
  },
  en: {
    common: enCommon,
    album: enAlbum,
    artist: enArtist,
    library: enLibrary,
    login: enLogin,
    signUp: enSignUp,
    authCallback: enAuthCallback,
    home: enHome,
    explore: enExplore,
    genre: enGenre,
    playlist: enPlaylist,
    search: enSearch,
    tabs: enTabs,
  },
} as const;

export type Namespace = keyof (typeof resources)["en"];
