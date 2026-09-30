// INFO: wires the adapters and the services once, at app start; takes no argument so route tests can replace this module.
import {
  createActivityService,
  createAlbumService,
  createGenresService,
  createHttpClient,
  createLibraryService,
  createPlaylistsService,
  createProfileService,
  createPublicService,
  createRecentSearchesService,
  createSearchService,
} from "@beatly/core";
import type {
  ActivityService,
  AlbumService,
  AuthPort,
  GenresService,
  LibraryService,
  LogPort,
  PlaylistsService,
  ProfileService,
  PublicService,
  RecentSearchesService,
  SearchService,
} from "@beatly/core";

import { createAuthAdapter } from "./adapters/auth.ts";
import { createHttpAdapter } from "./adapters/http.ts";
import { createLogAdapter } from "./adapters/log.ts";
import { createStorageAdapter } from "./adapters/storage.ts";
import { readPublicEnv } from "./env.ts";

export interface Core {
  readonly activity: ActivityService;
  readonly album: AlbumService;
  readonly auth: AuthPort;
  readonly genres: GenresService;
  readonly library: LibraryService;
  readonly log: LogPort;
  readonly playlists: PlaylistsService;
  readonly profile: ProfileService;
  // Named publicShare because public is a reserved word in strict mode.
  readonly publicShare: PublicService;
  readonly recentSearches: RecentSearchesService;
  readonly search: SearchService;
}

export function createCore(): Core {
  const env = readPublicEnv();
  const log = createLogAdapter();
  const auth = createAuthAdapter({
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  });
  const client = createHttpClient({
    http: createHttpAdapter(),
    auth,
    log,
    baseUrl: env.apiUrl,
  });
  return {
    activity: createActivityService(client),
    album: createAlbumService(client),
    auth,
    genres: createGenresService(client),
    library: createLibraryService(client),
    log,
    playlists: createPlaylistsService(client),
    profile: createProfileService(client),
    publicShare: createPublicService(client),
    recentSearches: createRecentSearchesService({ storage: createStorageAdapter(), log }),
    search: createSearchService(client),
  };
}
