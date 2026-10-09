// apps/mobile/test/helpers/core.tsx
//
// Test helper: builds a Core of inline port literals and renders a tree inside its providers.
//
// Tested:
// - Not a test itself; used by the screen, route and hook tests
//
// What is covered:
// apps/mobile/test/screens, apps/mobile/test/queries, apps/mobile/test/providers, apps/mobile/test/app
// (the stateful likes mirror, credits, membership, add, create-with-track and remove fakes, the activity writes, a play and a recent, the playback controller over an inline player, the up next, lyrics and related fixtures and fakes, the profile, recents, playlists, playlist detail, liked, genre header with its tracks, playlist track, library, library item, the saved read, add and remove, created playlist, genres, search album and artist fixtures and fakes, the in-memory storage, and the page builder)
//
import type {
  ActivityService,
  Album,
  AddTrackResult,
  AlbumService,
  Artist,
  ArtistsService,
  AuthPort,
  Genre,
  GenrePlaylistListItem,
  GenresService,
  HttpOutcome,
  LibraryEntry,
  LibraryItem,
  LikedPlaylist,
  LikeOutcome,
  LibraryService,
  LikesService,
  LogPort,
  PageResult,
  Playlist,
  PlaylistDetail,
  PlaylistListItem,
  PlaylistsService,
  PlayerEvent,
  PlayerPort,
  PlaylistTrack,
  Profile,
  ProfileService,
  PublicGenrePlaylist,
  PublicService,
  RecentEntity,
  SearchResult,
  SearchService,
  StoragePort,
  StreamResolver,
  TrackCredits,
  TrackLyrics,
  TrackRelated,
  TracksService,
  UpNext,
} from "@beatly/core";
import {
  createPlaybackController,
  createRecentSearchesService,
  createSheetNudgeService,
} from "@beatly/core";
import { jest } from "@jest/globals";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { CoreProvider } from "../../src/providers/CoreProvider.tsx";
import { createTestQueryClient } from "./queryClient.ts";

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

export const playlistDetailFixture: PlaylistDetail = {
  id: "p1",
  owner_id: "00000000-0000-0000-0000-000000000001",
  title: "Road trip",
  description: "Windows down",
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  total_count: 2,
  total_duration_seconds: 4440,
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};

// The liked route sends no thumbnail_urls.
export const likedDetailFixture: LikedPlaylist = {
  owner_id: playlistDetailFixture.owner_id,
  created_at: playlistDetailFixture.created_at,
  updated_at: playlistDetailFixture.updated_at,
  is_public: playlistDetailFixture.is_public,
  id: "liked",
  title: "liked",
  description: null,
  total_count: 0,
  total_duration_seconds: 0,
};

export const publicGenrePlaylistFixture: PublicGenrePlaylist = {
  id: "gp1",
  title: "Pop hits",
  description: null,
  track_count: 12,
  total_duration_seconds: 2400,
  thumbnails: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
  thumbnail_url: "test://img/cover",
  tracks: [],
};

export const playlistTrackFixture: PlaylistTrack = {
  track_id: "t1",
  title: "First Song",
  artists: [{ id: "ar1", name: "Test Artist" }],
  album: "Test Album",
  album_id: "al1",
  duration_seconds: 248,
  thumbnail_url: "test://img/t1",
  position: 1,
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

export const libraryItemFixture: LibraryItem = {
  kind: "album",
  external_id: "MPREb_1",
  title: "Test Album",
  thumbnail_url: "test://img/al1",
  artist: "Test Artist",
  artist_id: "ar1",
  album_id: "MPREb_1",
  album_name: "Test Album",
  source: "external",
  added_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
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
  artist: { id: "ar1", name: "Test Artist", thumbnail_url: "test://img/ar1" },
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
      title: "Test Album",
      artists: [{ id: "ar1", name: "Test Artist" }],
      year: "2024",
      thumbnail_url: null,
    },
  ],
};

export const artistFixture: Artist = {
  id: "UCar1",
  name: "Test Artist",
  thumbnail_url: "test://img/ar1",
  songs: [
    {
      track_id: "t1",
      title: "Popular Song",
      artists: [{ id: "UCar1", name: "Test Artist" }],
      album: "Test Album",
      album_id: "MPREb_1",
      duration_seconds: 248,
      thumbnail_url: "test://img/t1",
    },
    {
      track_id: null,
      title: "Hidden Song",
      artists: [],
      album: null,
      album_id: null,
      duration_seconds: null,
      thumbnail_url: null,
    },
  ],
  albums: [
    {
      id: "MPREb_1",
      title: "First Album",
      artists: [{ id: "UCar1", name: "Test Artist" }],
      year: "2013",
      audio_playlist_id: null,
      thumbnail_url: null,
    },
  ],
  singles: [
    { id: "MPREb_4", title: "A Single", year: "2024", type: "Single", thumbnail_url: null },
    { id: "MPREb_5", title: "An EP", year: "2023", type: "EP", thumbnail_url: null },
  ],
  related: [{ id: "UCar2", name: "Similar Artist", thumbnail_url: null }],
};

export const albumFixture: Album = {
  id: "MPREb_1",
  title: "Test Album",
  year: "2013",
  artists: [{ id: "ar1", name: "Test Artist" }],
  track_count: 13,
  duration_seconds: 4440,
  audio_playlist_id: "OLAK5uy_1",
  thumbnail_url: "test://img/al1",
  tracks: [
    {
      track_id: "t1",
      title: "First Song",
      artists: [{ id: "ar1", name: "Test Artist" }],
      duration_seconds: 248,
      is_available: true,
      track_number: 1,
    },
    {
      track_id: null,
      title: "Hidden Song",
      artists: [],
      duration_seconds: null,
      is_available: false,
      track_number: 2,
    },
  ],
  other_versions: [
    {
      id: "MPREb_2",
      title: "Other Version",
      artists: [{ id: "ar1", name: "Test Artist" }],
      year: "2014",
      audio_playlist_id: "OLAK5uy_2",
      thumbnail_url: "test://img/al2",
    },
  ],
  related_recommendations: [
    {
      id: "MPREb_3",
      title: "Recommended Album",
      artists: [{ id: "ar2", name: "Another Artist" }],
      year: null,
      audio_playlist_id: null,
      thumbnail_url: null,
    },
  ],
};

const trackRef = (id: string) => ({
  track_id: id,
  title: `Up ${id}`,
  artists: [{ id: "ar1", name: "Test Artist" }],
  album: "Test Album",
  album_id: "al1",
  duration_seconds: 200,
  thumbnail_url: `test://img/${id}`,
});

// The first track is the requested one, as the route sends it.
export const upNextFixture: UpNext = {
  tracks: [trackRef("t1"), trackRef("u2"), trackRef("u3")],
};

export const lyricsFixture: TrackLyrics = {
  lyrics: {
    has_timestamps: true,
    source: "test",
    lines: [
      { text: "Line one", start_ms: 0, end_ms: 10000 },
      { text: "Line two", start_ms: 10000, end_ms: 20000 },
      { text: "Line three", start_ms: 20000, end_ms: 30000 },
    ],
  },
};

export const relatedFixture: TrackRelated = {
  songs: [trackRef("r1")],
  artists: [{ id: "UCar2", name: "Similar Artist", thumbnail_url: null }],
  albums: [
    {
      id: "MPREb_2",
      title: "Related Album",
      artists: [{ id: "ar2", name: "Another Artist" }],
      year: "2014",
      audio_playlist_id: null,
      thumbnail_url: null,
    },
  ],
};

export const creditsFixture: TrackCredits = {
  performed_by: { localized_title: "Performed by", names: ["Test Artist"] },
  written_by: { localized_title: "Written by", names: ["Writer One", "Writer Two"] },
  produced_by: null,
  music_metadata_provided_by: null,
  other_sections: [{ localized_title: "Mixed by", names: ["Mixer"] }],
};

export const emptyCreditsFixture: TrackCredits = {
  performed_by: null,
  written_by: null,
  produced_by: null,
  music_metadata_provided_by: null,
  other_sections: [],
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
export function stateFlag(
  node: { props: unknown },
  flag: "disabled" | "busy" | "checked" | "selected",
) {
  const props = node.props;
  if (typeof props !== "object" || props === null || !("accessibilityState" in props))
    return undefined;
  const state = props.accessibilityState;
  if (typeof state !== "object" || state === null || !(flag in state)) return undefined;
  return (state as Record<string, unknown>)[flag];
}

// An inline player port: jest.fn members and an emit that sends an event to the registered listener.
export function makePlayer() {
  let listener: (event: PlayerEvent) => void = () => undefined;
  const port = {
    load: jest.fn<PlayerPort["load"]>(),
    play: jest.fn<PlayerPort["play"]>(),
    pause: jest.fn<PlayerPort["pause"]>(),
    seek: jest.fn<PlayerPort["seek"]>(() => Promise.resolve()),
    unload: jest.fn<PlayerPort["unload"]>(),
    onEvent: jest.fn<PlayerPort["onEvent"]>((next) => {
      listener = next;
      return () => undefined;
    }),
  };
  return {
    port,
    emit: (event: PlayerEvent) => {
      listener(event);
    },
  };
}

export function makeCore(
  options: {
    auth?: MockAuth;
    getMyProfile?: ProfileService["getMyProfile"];
    listRecents?: ActivityService["listRecents"];
    logPlay?: ActivityService["logPlay"];
    registerRecent?: ActivityService["registerRecent"];
    listPlaylists?: PlaylistsService["listPlaylists"];
    createPlaylist?: PlaylistsService["createPlaylist"];
    listLibrary?: LibraryService["listLibrary"];
    getSavedState?: LibraryService["getSavedState"];
    saveItem?: LibraryService["saveItem"];
    removeItem?: LibraryService["removeItem"];
    sync?: LikesService["sync"];
    clear?: LikesService["clear"];
    listGenres?: GenresService["listGenres"];
    listGenrePlaylists?: GenresService["listGenrePlaylists"];
    listGenreCategories?: GenresService["listGenreCategories"];
    search?: SearchService["search"];
    getAlbum?: AlbumService["getAlbum"];
    getArtist?: ArtistsService["getArtist"];
    getPlaylist?: PlaylistsService["getPlaylist"];
    listPlaylistTracks?: PlaylistsService["listPlaylistTracks"];
    getLikedPlaylist?: PlaylistsService["getLikedPlaylist"];
    listLikedTracks?: PlaylistsService["listLikedTracks"];
    getGenrePlaylist?: PublicService["getGenrePlaylist"];
    getUpNext?: TracksService["getUpNext"];
    getLyrics?: TracksService["getLyrics"];
    getRelated?: TracksService["getRelated"];
    getCredits?: TracksService["getCredits"];
    listPlaylistsWithTrack?: PlaylistsService["listPlaylistsWithTrack"];
    addTrackToPlaylist?: PlaylistsService["addTrackToPlaylist"];
    createPlaylistWithTrack?: PlaylistsService["createPlaylistWithTrack"];
    removeTrackFromPlaylist?: PlaylistsService["removeTrackFromPlaylist"];
    updatePlaylist?: PlaylistsService["updatePlaylist"];
    deletePlaylist?: PlaylistsService["deletePlaylist"];
    // What setLiked answers after it flipped the mirror, as the real service does before the network.
    likeOutcome?: () => Promise<LikeOutcome>;
    likedIds?: readonly string[];
    storage?: StoragePort;
    resolve?: StreamResolver["resolve"];
  } = {},
) {
  const auth = options.auth ?? makeAuth();
  const getMyProfile = jest.fn<ProfileService["getMyProfile"]>(
    options.getMyProfile ?? (() => Promise.resolve(successOf(profileFixture))),
  );
  const listRecents = jest.fn<ActivityService["listRecents"]>(
    options.listRecents ?? (() => Promise.resolve(pageOf<RecentEntity>([]))),
  );
  const logPlay = jest.fn<ActivityService["logPlay"]>(
    options.logPlay ??
      (() =>
        Promise.resolve({
          kind: "success",
          data: { track_id: "t1", played_at: "2026-01-01T00:00:00Z" },
          maxAgeSeconds: 0,
        })),
  );
  const registerRecent = jest.fn<ActivityService["registerRecent"]>(
    options.registerRecent ??
      (() => Promise.resolve({ kind: "success", data: recentFixture, maxAgeSeconds: 0 })),
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
  const getSavedState = jest.fn<LibraryService["getSavedState"]>(
    options.getSavedState ??
      (() => Promise.resolve({ kind: "success", data: { saved: false }, maxAgeSeconds: 0 })),
  );
  const saveItem = jest.fn<LibraryService["saveItem"]>(
    options.saveItem ??
      (() => Promise.resolve({ kind: "success", data: libraryItemFixture, maxAgeSeconds: 0 })),
  );
  const removeItem = jest.fn<LibraryService["removeItem"]>(
    options.removeItem ??
      (() => Promise.resolve({ kind: "success", data: null, maxAgeSeconds: 0 })),
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
  const getAlbum = jest.fn<AlbumService["getAlbum"]>(
    options.getAlbum ??
      (() => Promise.resolve({ kind: "success", data: albumFixture, maxAgeSeconds: 0 })),
  );
  const getArtist = jest.fn<ArtistsService["getArtist"]>(
    options.getArtist ??
      (() => Promise.resolve({ kind: "success", data: artistFixture, maxAgeSeconds: 0 })),
  );
  const getPlaylist = jest.fn<PlaylistsService["getPlaylist"]>(
    options.getPlaylist ??
      (() => Promise.resolve({ kind: "success", data: playlistDetailFixture, maxAgeSeconds: 0 })),
  );
  const listPlaylistTracks = jest.fn<PlaylistsService["listPlaylistTracks"]>(
    options.listPlaylistTracks ?? (() => Promise.resolve(pageOf<PlaylistTrack>([]))),
  );
  const getLikedPlaylist = jest.fn<PlaylistsService["getLikedPlaylist"]>(
    options.getLikedPlaylist ??
      (() => Promise.resolve({ kind: "success", data: likedDetailFixture, maxAgeSeconds: 0 })),
  );
  const listLikedTracks = jest.fn<PlaylistsService["listLikedTracks"]>(
    options.listLikedTracks ?? (() => Promise.resolve(pageOf<PlaylistTrack>([]))),
  );
  const getGenrePlaylist = jest.fn<PublicService["getGenrePlaylist"]>(
    options.getGenrePlaylist ??
      (() =>
        Promise.resolve({
          kind: "success",
          data: publicGenrePlaylistFixture,
          maxAgeSeconds: 0,
        })),
  );
  const getUpNext = jest.fn<TracksService["getUpNext"]>(
    options.getUpNext ??
      (() => Promise.resolve({ kind: "success", data: upNextFixture, maxAgeSeconds: 0 })),
  );
  const getLyrics = jest.fn<TracksService["getLyrics"]>(
    options.getLyrics ??
      (() => Promise.resolve({ kind: "success", data: lyricsFixture, maxAgeSeconds: 0 })),
  );
  const getRelated = jest.fn<TracksService["getRelated"]>(
    options.getRelated ??
      (() => Promise.resolve({ kind: "success", data: relatedFixture, maxAgeSeconds: 0 })),
  );
  const getCredits = jest.fn<TracksService["getCredits"]>(
    options.getCredits ??
      (() => Promise.resolve({ kind: "success", data: creditsFixture, maxAgeSeconds: 0 })),
  );
  const listPlaylistsWithTrack = jest.fn<PlaylistsService["listPlaylistsWithTrack"]>(
    options.listPlaylistsWithTrack ??
      (() => Promise.resolve({ kind: "success", data: { playlist_ids: [] }, maxAgeSeconds: 0 })),
  );
  const alreadyAdded: AddTrackResult = { alreadyThere: false };
  const addTrackToPlaylist = jest.fn<PlaylistsService["addTrackToPlaylist"]>(
    options.addTrackToPlaylist ??
      (() => Promise.resolve({ kind: "success", data: alreadyAdded, maxAgeSeconds: 0 })),
  );
  const createPlaylistWithTrack = jest.fn<PlaylistsService["createPlaylistWithTrack"]>(
    options.createPlaylistWithTrack ??
      (() =>
        Promise.resolve({
          kind: "success",
          data: { playlist: createdPlaylistFixture },
          maxAgeSeconds: 0,
        })),
  );
  const removeTrackFromPlaylist = jest.fn<PlaylistsService["removeTrackFromPlaylist"]>(
    options.removeTrackFromPlaylist ??
      (() => Promise.resolve({ kind: "success", data: null, maxAgeSeconds: 0 })),
  );
  const updatePlaylist = jest.fn<PlaylistsService["updatePlaylist"]>(
    options.updatePlaylist ??
      (() => Promise.resolve({ kind: "success", data: createdPlaylistFixture, maxAgeSeconds: 0 })),
  );
  const deletePlaylist = jest.fn<PlaylistsService["deletePlaylist"]>(
    options.deletePlaylist ??
      (() => Promise.resolve({ kind: "success", data: null, maxAgeSeconds: 0 })),
  );
  // The mirror: a set of liked ids and its listeners, so a toggle re-renders the hearts as the real one does.
  const liked = new Set<string>(options.likedIds ?? []);
  const likeListeners = new Set<() => void>();
  const notifyLikes = () => {
    likeListeners.forEach((listener) => {
      listener();
    });
  };
  const confirmedOutcome: LikeOutcome = { kind: "confirmed" };
  let confirmedListener: () => void = () => undefined;
  const likes = {
    isLiked: jest.fn<LikesService["isLiked"]>((trackId) => liked.has(trackId)),
    subscribe: jest.fn<LikesService["subscribe"]>((listener) => {
      likeListeners.add(listener);
      return () => {
        likeListeners.delete(listener);
      };
    }),
    onConfirmed: jest.fn<LikesService["onConfirmed"]>((listener) => {
      confirmedListener = listener;
      return () => undefined;
    }),
    setLiked: jest.fn<LikesService["setLiked"]>((track, value) => {
      if (value) liked.add(track.track_id);
      else liked.delete(track.track_id);
      notifyLikes();
      return options.likeOutcome?.() ?? Promise.resolve(confirmedOutcome);
    }),
    sync: jest.fn<LikesService["sync"]>(
      options.sync ?? (() => Promise.resolve({ kind: "success" })),
    ),
    clear: jest.fn<LikesService["clear"]>(
      options.clear ?? (() => Promise.resolve({ kind: "success" })),
    ),
  };
  const emitLikeConfirmed = () => {
    confirmedListener();
  };
  const storage = options.storage ?? memoryStorage();
  const log = makeLog();
  const player = makePlayer();
  const resolve = jest.fn<StreamResolver["resolve"]>(
    options.resolve ?? ((id) => Promise.resolve({ kind: "resolved", url: `test://audio/${id}` })),
  );
  const playback = createPlaybackController({
    player: player.port,
    streams: { resolve },
    log,
  });
  const core: Core = {
    activity: { listRecents, logPlay, registerRecent },
    album: { getAlbum },
    artists: { getArtist },
    auth,
    genres: { listGenres, listGenrePlaylists, listGenreCategories },
    library: { listLibrary, getSavedState, saveItem, removeItem },
    likes,
    log,
    playback,
    playlists: {
      listPlaylists,
      createPlaylist,
      getPlaylist,
      listPlaylistTracks,
      getLikedPlaylist,
      listLikedTracks,
      listPlaylistsWithTrack,
      addTrackToPlaylist,
      createPlaylistWithTrack,
      removeTrackFromPlaylist,
      updatePlaylist,
      deletePlaylist,
    },
    profile: { getMyProfile },
    publicShare: { getGenrePlaylist },
    recentSearches: createRecentSearchesService({ storage, log }),
    search: { search },
    sheetNudge: createSheetNudgeService({ storage, log }),
    tracks: { getUpNext, getLyrics, getRelated, getCredits },
  };
  return {
    core,
    auth,
    log,
    getMyProfile,
    listRecents,
    logPlay,
    registerRecent,
    listPlaylists,
    createPlaylist,
    listLibrary,
    getSavedState,
    saveItem,
    removeItem,
    likes,
    emitLikeConfirmed,
    listGenres,
    listGenrePlaylists,
    listGenreCategories,
    search,
    getAlbum,
    getArtist,
    getPlaylist,
    listPlaylistTracks,
    getLikedPlaylist,
    listLikedTracks,
    getGenrePlaylist,
    getUpNext,
    getLyrics,
    getRelated,
    getCredits,
    listPlaylistsWithTrack,
    addTrackToPlaylist,
    createPlaylistWithTrack,
    removeTrackFromPlaylist,
    updatePlaylist,
    deletePlaylist,
    storage,
    playback,
    player,
    resolve,
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
      <QueryClientProvider client={client ?? createTestQueryClient()}>
        {children}
      </QueryClientProvider>
    </CoreProvider>
  );
}
