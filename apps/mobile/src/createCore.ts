// INFO: wires the adapters and the services once, at app start; takes no argument so route tests can replace this module.
import {
  createActivityService,
  createAlbumService,
  createArtistsService,
  createAutoplayService,
  createBugReportsService,
  createErrorsService,
  createGenresService,
  createHttpClient,
  createLibraryService,
  createLikesService,
  createListeningCounter,
  createOnboardingMarkService,
  createOnboardingService,
  createPlaybackController,
  createPlaybackErrorReporter,
  createPlaylistsService,
  createProfileService,
  createPublicService,
  createRecommendationsService,
  createRecentSearchesService,
  createSearchService,
  createSheetNudgeService,
  createStreamResolver,
  createTracksService,
  migrate,
} from "@beatly/core";
import type {
  ActivityService,
  AlbumService,
  ArtistsService,
  AuthPort,
  AutoplayService,
  BugReportsService,
  GenresService,
  LibraryService,
  LikesService,
  LogPort,
  OnboardingMarkService,
  OnboardingService,
  PlaybackController,
  PlaylistsService,
  ProfileService,
  PublicService,
  RecommendationsService,
  RecentSearchesService,
  SearchService,
  SheetNudgeService,
  TracksService,
} from "@beatly/core";

import { Platform } from "react-native";

import { createAuthAdapter } from "./adapters/auth.ts";
import { createConfigAdapter } from "./adapters/config.ts";
import { createDbAdapter } from "./adapters/db.ts";
import { readDevice } from "./adapters/device.ts";
import { createHttpAdapter } from "./adapters/http.ts";
import { createLogAdapter } from "./adapters/log.ts";
import { createPlayerAdapter } from "./adapters/player.ts";
import { createStorageAdapter } from "./adapters/storage.ts";
import { readPublicEnv } from "./env.ts";

export interface Core {
  readonly activity: ActivityService;
  readonly album: AlbumService;
  readonly artists: ArtistsService;
  readonly auth: AuthPort;
  readonly autoplay: AutoplayService;
  readonly bugReports: BugReportsService;
  readonly genres: GenresService;
  readonly library: LibraryService;
  readonly likes: LikesService;
  readonly log: LogPort;
  readonly onboarding: OnboardingService;
  readonly onboardingMark: OnboardingMarkService;
  readonly playback: PlaybackController;
  readonly playlists: PlaylistsService;
  readonly profile: ProfileService;
  // Named publicShare because public is a reserved word in strict mode.
  readonly publicShare: PublicService;
  readonly recentSearches: RecentSearchesService;
  readonly recommendations: RecommendationsService;
  readonly search: SearchService;
  readonly sheetNudge: SheetNudgeService;
  readonly tracks: TracksService;
}

export function createCore(): Core {
  const env = readPublicEnv();
  const log = createLogAdapter();
  const auth = createAuthAdapter({
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  });
  const http = createHttpAdapter();
  const storage = createStorageAdapter();
  const db = createDbAdapter();
  const migrated = migrate(db, log); // applied once, at app start
  const client = createHttpClient({
    http,
    auth,
    log,
    baseUrl: env.apiUrl,
  });
  const activity = createActivityService(client);
  const recommendations = createRecommendationsService(client);
  const playback = createPlaybackController({
    player: createPlayerAdapter({ log }),
    streams: createStreamResolver({
      http,
      config: createConfigAdapter(env),
      storage,
      log,
      platform: Platform.OS === "ios" ? "ios" : "android",
    }),
    log,
  });
  // Lives as long as the app: counts listening and registers plays; the unsubscribe is not kept.
  createListeningCounter({ playback, activity, log });
  // Lives as long as the app: reports every playback failure; the unsubscribe is not kept.
  createPlaybackErrorReporter({
    playback,
    errors: createErrorsService(client),
    auth,
    device: readDevice(),
    log,
  });
  return {
    activity,
    album: createAlbumService(client),
    artists: createArtistsService(client),
    auth,
    autoplay: createAutoplayService({ storage, log }),
    bugReports: createBugReportsService(client),
    genres: createGenresService(client),
    library: createLibraryService(client),
    likes: createLikesService({ client, db, log, migrated }),
    log,
    onboarding: createOnboardingService(client, recommendations),
    onboardingMark: createOnboardingMarkService({ storage, auth, log }),
    playback,
    playlists: createPlaylistsService(client),
    profile: createProfileService(client),
    publicShare: createPublicService(client),
    recentSearches: createRecentSearchesService({ storage, log }),
    recommendations,
    search: createSearchService(client),
    sheetNudge: createSheetNudgeService(),
    tracks: createTracksService(client),
  };
}
