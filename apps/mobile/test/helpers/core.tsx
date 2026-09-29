// apps/mobile/test/helpers/core.tsx
//
// Test helper: builds a Core of inline port literals and renders a tree inside its providers.
//
// Tested:
// - Not a test itself; used by the screen, route and hook tests
//
// What is covered:
// apps/mobile/test/screens, apps/mobile/test/queries, apps/mobile/test/providers, apps/mobile/test/app
// (the profile, recents, playlists, library, created playlist, genres and search fixtures and fakes, the in-memory storage, and the page builder)
//
import type {
  ActivityService,
  AuthPort,
  Genre,
  GenrePlaylistListItem,
  GenresService,
  HttpOutcome,
  LibraryEntry,
  LibraryService,
  LogPort,
  PageResult,
  Playlist,
  PlaylistListItem,
  PlaylistsService,
  Profile,
  ProfileService,
  RecentEntity,
  SearchResult,
  SearchService,
  StoragePort,
} from "@beatly/core";
import { createRecentSearchesService } from "@beatly/core";
import { jest } from "@jest/globals";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { CoreProvider } from "../../src/providers/CoreProvider.tsx";
import { createQueryClient } from "../../src/queries/queryClient.ts";

export const profileFixture: Profile = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "user",
  username: "maxi_23",
  display_name: "Maxi",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const recentFixture: RecentEntity = {
  entity_type: "album",
  entity_id: "a1",
  played_at: "2026-01-01T00:00:00Z",
  metadata: { title: "Recent album", subtitle: "Some artist", thumbnail_url: "test://img/r1" },
};

export const playlistFixture: PlaylistListItem = {
  id: "p1",
  owner_id: "00000000-0000-0000-0000-000000000001",
  title: "Road trip",
  description: "Windows down",
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};

export const likedEntryFixture: LibraryEntry = {
  kind: "playlist",
  id: "liked",
  title: "liked",
  thumbnail_url: null,
  subtitle: null,
  source: "liked",
  thumbnail_urls: [],
};

export const ownPlaylistEntryFixture: LibraryEntry = {
  kind: "playlist",
  id: "p1",
  title: "Road trip",
  thumbnail_url: null,
  subtitle: null,
  source: "user",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};

export const savedAlbumEntryFixture: LibraryEntry = {
  kind: "album",
  id: "a1",
  title: "Saved album",
  thumbnail_url: "test://img/a1",
  subtitle: "Some artist",
  source: "external",
  thumbnail_urls: [],
};

export const savedPlaylistEntryFixture: LibraryEntry = {
  kind: "playlist",
  id: "gp1",
  title: "Saved playlist",
  thumbnail_url: null,
  subtitle: null,
  source: "genre",
  thumbnail_urls: [],
};

export const createdPlaylistFixture: Playlist = {
  id: "p9",
  owner_id: "00000000-0000-0000-0000-000000000001",
  title: "New one",
  description: null,
  is_public: false,
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

export const genreFixture: Genre = { slug: "pop", name: "Pop", description: null };

export const genrePlaylistFixture: GenrePlaylistListItem = {
  id: "gp1",
  title: "Pop hits",
  description: null,
  thumbnail_url: "test://img/cover",
  track_count: 12,
  category: "Hits",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};

export const searchResultFixture: SearchResult = {
  artist: { id: "ar1", name: "Test Artist" },
  songs: [
    {
      track_id: "t1",
      title: "Test Song",
      artists: [{ id: "ar1", name: "Test Artist" }],
      album: "Test Album",
      album_id: "al1",
      duration_seconds: 225,
      thumbnail_url: "test://img/t1",
    },
  ],
  albums: [
    {
      id: "al1",
      playlist_id: "pl1",
      title: "Test Album",
      artists: [{ id: "ar1", name: "Test Artist" }],
      year: "2024",
      thumbnail_url: null,
    },
  ],
};

export function memoryStorage(initial: Record<string, string> = {}): StoragePort {
  const values = new Map<string, string>(Object.entries(initial));
  return {
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
    delete: (key) => {
      values.delete(key);
      return Promise.resolve();
    },
  };
}

export function pageOf<T>(
  items: T[],
  page: Partial<PageResult<T>["page"]> = {},
): HttpOutcome<PageResult<T>> {
  return {
    kind: "success",
    maxAgeSeconds: 0,
    data: {
      items,
      page: { limit: 50, next_cursor: null, has_more: false, total: items.length, ...page },
      restartedFromFirstPage: false,
    },
  };
}

export function successOf(data: Profile): HttpOutcome<Profile> {
  return { kind: "success", data, maxAgeSeconds: 0 };
}

function baseAuth() {
  return {
    getAccessToken: jest.fn<AuthPort["getAccessToken"]>(() => Promise.resolve("test-token")),
    getStatus: jest.fn<AuthPort["getStatus"]>(() => Promise.resolve("signed_in")),
    onAuthChange: jest.fn<AuthPort["onAuthChange"]>(() => () => undefined),
    signIn: jest.fn<AuthPort["signIn"]>(() => Promise.resolve({ kind: "success" })),
    signUp: jest.fn<AuthPort["signUp"]>(() => Promise.resolve({ kind: "confirmation_sent" })),
    signOut: jest.fn<AuthPort["signOut"]>(() => Promise.resolve({ kind: "success" })),
    confirmEmail: jest.fn<AuthPort["confirmEmail"]>(() => Promise.resolve({ kind: "success" })),
  };
}

export type MockAuth = ReturnType<typeof baseAuth>;

export function makeAuth(overrides: Partial<MockAuth> = {}): MockAuth {
  return { ...baseAuth(), ...overrides };
}

export function makeLog() {
  return {
    debug: jest.fn<LogPort["debug"]>(),
    info: jest.fn<LogPort["info"]>(),
    warn: jest.fn<LogPort["warn"]>(),
    error: jest.fn<LogPort["error"]>(),
  };
}

// Reads a flag of a node's accessibilityState without an untyped member access.
export function stateFlag(node: { props: unknown }, flag: "disabled" | "busy" | "checked") {
  const props = node.props;
  if (typeof props !== "object" || props === null || !("accessibilityState" in props))
    return undefined;
  const state = props.accessibilityState;
  if (typeof state !== "object" || state === null || !(flag in state)) return undefined;
  return (state as Record<string, unknown>)[flag];
}

export function makeCore(
  options: {
    auth?: MockAuth;
    getMyProfile?: ProfileService["getMyProfile"];
    listRecents?: ActivityService["listRecents"];
    listPlaylists?: PlaylistsService["listPlaylists"];
    createPlaylist?: PlaylistsService["createPlaylist"];
    listLibrary?: LibraryService["listLibrary"];
    listGenres?: GenresService["listGenres"];
    listGenrePlaylists?: GenresService["listGenrePlaylists"];
    listGenreCategories?: GenresService["listGenreCategories"];
    search?: SearchService["search"];
    storage?: StoragePort;
  } = {},
) {
  const auth = options.auth ?? makeAuth();
  const getMyProfile = jest.fn<ProfileService["getMyProfile"]>(
    options.getMyProfile ?? (() => Promise.resolve(successOf(profileFixture))),
  );
  const listRecents = jest.fn<ActivityService["listRecents"]>(
    options.listRecents ?? (() => Promise.resolve(pageOf<RecentEntity>([]))),
  );
  const listPlaylists = jest.fn<PlaylistsService["listPlaylists"]>(
    options.listPlaylists ?? (() => Promise.resolve(pageOf<PlaylistListItem>([]))),
  );
  const createPlaylist = jest.fn<PlaylistsService["createPlaylist"]>(
    options.createPlaylist ??
      (() => Promise.resolve({ kind: "success", data: createdPlaylistFixture, maxAgeSeconds: 0 })),
  );
  const listLibrary = jest.fn<LibraryService["listLibrary"]>(
    options.listLibrary ?? (() => Promise.resolve(pageOf<LibraryEntry>([likedEntryFixture]))),
  );
  const listGenres = jest.fn<GenresService["listGenres"]>(
    options.listGenres ?? (() => Promise.resolve(pageOf<Genre>([]))),
  );
  const listGenrePlaylists = jest.fn<GenresService["listGenrePlaylists"]>(
    options.listGenrePlaylists ?? (() => Promise.resolve(pageOf<GenrePlaylistListItem>([]))),
  );
  const listGenreCategories = jest.fn<GenresService["listGenreCategories"]>(
    options.listGenreCategories ?? (() => Promise.resolve(pageOf<string>([]))),
  );
  const search = jest.fn<SearchService["search"]>(
    options.search ??
      (() => Promise.resolve({ kind: "success", data: searchResultFixture, maxAgeSeconds: 0 })),
  );
  const storage = options.storage ?? memoryStorage();
  const log = makeLog();
  const core: Core = {
    activity: { listRecents },
    auth,
    genres: { listGenres, listGenrePlaylists, listGenreCategories },
    library: { listLibrary },
    log,
    playlists: { listPlaylists, createPlaylist },
    profile: { getMyProfile },
    recentSearches: createRecentSearchesService({ storage, log }),
    search: { search },
  };
  return {
    core,
    auth,
    log,
    getMyProfile,
    listRecents,
    listPlaylists,
    createPlaylist,
    listLibrary,
    listGenres,
    listGenrePlaylists,
    listGenreCategories,
    search,
    storage,
  };
}

export function Wrapper({
  core,
  client,
  children,
}: {
  core: Core;
  client?: QueryClient;
  children: ReactNode;
}) {
  return (
    <CoreProvider core={core}>
      <QueryClientProvider client={client ?? createQueryClient()}>{children}</QueryClientProvider>
    </CoreProvider>
  );
}
