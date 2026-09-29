// INFO: public entry of @beatly/core: ports, the envelope, the HTTP client, the paginated helper and the services.
export type {
  AuthChange,
  AuthFailure,
  AuthFailureReason,
  AuthPort,
  AuthResult,
  AuthStatus,
  EmailLink,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from "./ports/auth.ts";
export type { HttpMethod, HttpPort, HttpRequest, HttpResponse } from "./ports/http.ts";
export type { LogFields, LogPort } from "./ports/log.ts";
export {
  apiReasonSchema,
  envelopeSchema,
  pageBlockSchema,
  paginatedSchema,
} from "./domain/envelope.ts";
export type { ApiReason, PageBlock } from "./domain/envelope.ts";
export type {
  ApiFailure,
  HttpOutcome,
  Success,
  TransportCause,
  TransportFailure,
} from "./http/outcome.ts";
export { DEFAULT_MAX_AGE_SECONDS, parseMaxAge } from "./http/cacheControl.ts";
export { DEFAULT_TIMEOUT_MS, createHttpClient } from "./http/client.ts";
export type { HttpClient, HttpClientDeps, QueryParams, RequestOptions } from "./http/client.ts";
export { fetchPage } from "./http/paginated.ts";
export type { FetchPageOptions, PageResult } from "./http/paginated.ts";
export { profileName, profileSchema } from "./domain/profile.ts";
export type { Profile } from "./domain/profile.ts";
export { createProfileService, profileReasonSchema } from "./services/profile.ts";
export type { ProfileReason, ProfileService } from "./services/profile.ts";
export { playlistListItemSchema, playlistSchema } from "./domain/playlist.ts";
export type { Playlist, PlaylistListItem } from "./domain/playlist.ts";
export { createPlaylistsService } from "./services/playlists.ts";
export type { CreatePlaylistInput, PlaylistsService } from "./services/playlists.ts";
export { libraryEntryKindSchema, libraryEntrySchema } from "./domain/library.ts";
export type { LibraryEntry } from "./domain/library.ts";
export { createLibraryService } from "./services/library.ts";
export type { LibraryService } from "./services/library.ts";
export { recentEntitySchema, recentEntityTypeSchema } from "./domain/activity.ts";
export type { RecentEntity } from "./domain/activity.ts";
export { createActivityService } from "./services/activity.ts";
export type { ActivityService } from "./services/activity.ts";
export { genreCategorySchema, genrePlaylistListItemSchema, genreSchema } from "./domain/genre.ts";
export type { Genre, GenrePlaylistListItem } from "./domain/genre.ts";
export { createGenresService } from "./services/genres.ts";
export type { GenresService } from "./services/genres.ts";
export type { StoragePort } from "./ports/storage.ts";
export {
  searchAlbumSchema,
  searchArtistRefSchema,
  searchArtistSchema,
  searchResultSchema,
  searchSongSchema,
} from "./domain/search.ts";
export type {
  SearchAlbum,
  SearchArtist,
  SearchArtistRef,
  SearchResult,
  SearchSong,
} from "./domain/search.ts";
export { createSearchService } from "./services/search.ts";
export type { SearchService } from "./services/search.ts";
export {
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_LIMIT,
  createRecentSearchesService,
} from "./services/recentSearches.ts";
export type {
  RecentSearchesOutcome,
  RecentSearchesService,
  StorageFailure,
} from "./services/recentSearches.ts";
