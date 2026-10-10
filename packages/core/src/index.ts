// INFO: public entry of @beatly/core: ports, the envelope, the HTTP client, the paginated helper, the services, the playback controller, the listening counter, the errors service, the playback error reporter, the stream resolver, the local database and its migrations, and the likes mirror.
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
export type { ConfigPort } from "./ports/config.ts";
export type { DbExecutor, DbPort, SqlValue } from "./ports/db.ts";
export type { LogFields, LogPort } from "./ports/log.ts";
export type { PlayerEvent, PlayerPort } from "./ports/player.ts";
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
export {
  likedPlaylistSchema,
  playlistDetailSchema,
  ownedPlaylistIdsSchema,
  playlistListItemSchema,
  playlistSchema,
  playlistTrackSchema,
} from "./domain/playlist.ts";
export type {
  Playlist,
  LikedPlaylist,
  PlaylistDetail,
  PlaylistListItem,
  PlaylistTrack,
  OwnedPlaylistIds,
} from "./domain/playlist.ts";
export { publicGenrePlaylistSchema } from "./domain/public.ts";
export type { PublicGenrePlaylist } from "./domain/public.ts";
export { createPublicService } from "./services/public.ts";
export type { PublicService } from "./services/public.ts";
export {
  addTrackInputOf,
  createPlaylistsService,
  createTrackEditor,
} from "./services/playlists.ts";
export type {
  AddTrackInput,
  AddTrackResult,
  CreatePlaylistInput,
  PlaylistsService,
  TrackEdit,
  TrackEditResult,
  TrackEditor,
  UpdatePlaylistInput,
} from "./services/playlists.ts";
export {
  BUG_REPORT_CATEGORIES,
  bugReportCategorySchema,
  bugReportEntityTypeSchema,
  bugReportSchema,
  bugReportStatusSchema,
} from "./domain/bugReport.ts";
export type {
  BugReport,
  BugReportCategory,
  BugReportEntityType,
  BugReportStatus,
} from "./domain/bugReport.ts";
export { createBugReportsService } from "./services/bugReports.ts";
export type { BugReportsService, CreateBugReportInput } from "./services/bugReports.ts";
export {
  libraryEntryKindSchema,
  libraryEntrySchema,
  libraryItemSchema,
  librarySavedStateSchema,
} from "./domain/library.ts";
export type { LibraryEntry, LibraryItem, LibrarySavedState } from "./domain/library.ts";
export {
  albumLibraryInputOf,
  createLibraryService,
  genrePlaylistLibraryInputOf,
} from "./services/library.ts";
export type { LibraryItemInput, LibraryItemKind, LibraryService } from "./services/library.ts";
export { playEventSchema, recentEntitySchema, recentEntityTypeSchema } from "./domain/activity.ts";
export type { PlayEvent, RecentEntity } from "./domain/activity.ts";
export { createActivityService } from "./services/activity.ts";
export type { ActivityService, PlayArtist, PlayInput, RecentInput } from "./services/activity.ts";
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
export { albumRefSchema, albumSchema, albumTrackSchema } from "./domain/album.ts";
export type { Album, AlbumRef, AlbumTrack } from "./domain/album.ts";
export { createAlbumService } from "./services/album.ts";
export type { AlbumService } from "./services/album.ts";
export {
  artistSchema,
  artistSingleSchema,
  artistSongSchema,
  relatedArtistSchema,
} from "./domain/artist.ts";
export type { Artist, ArtistSingle, ArtistSong, RelatedArtist } from "./domain/artist.ts";
export { createArtistsService } from "./services/artists.ts";
export type { ArtistsService } from "./services/artists.ts";
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
export { PREVIOUS_RESTARTS_AFTER_SECONDS, createPlaybackController } from "./services/playback.ts";
export type {
  PlayableTrack,
  PlaybackController,
  PlaybackFailure,
  PlaybackSource,
  PlaybackState,
  PlaybackStatus,
  StreamFailureCause,
  StreamResolution,
  StreamResolver,
} from "./services/playback.ts";
export { STREAM_CONTAINERS, chooseStreamFormat, createStreamResolver } from "./services/streams.ts";
export type { ChosenStreamFormat, StreamFormat, StreamPlatform } from "./services/streams.ts";
export {
  creditSectionSchema,
  trackCreditsSchema,
  lyricsLineSchema,
  lyricsSchema,
  trackLyricsSchema,
  trackRefSchema,
  trackRelatedSchema,
  upNextSchema,
} from "./domain/track.ts";
export type {
  LyricsLine,
  Lyrics,
  TrackCredits,
  CreditSection,
  TrackLyrics,
  TrackRef,
  TrackRelated,
  UpNext,
} from "./domain/track.ts";
export { createTracksService } from "./services/tracks.ts";
export type { TracksService } from "./services/tracks.ts";
export {
  SHEET_NUDGE_KEY,
  SHEET_NUDGE_LIMIT,
  createSheetNudgeService,
} from "./services/sheetNudge.ts";
export type { SheetNudgeOutcome, SheetNudgeService } from "./services/sheetNudge.ts";
export {
  MAX_LISTEN_STEP_SECONDS,
  PLAY_AFTER_SECONDS,
  createListeningCounter,
} from "./services/listening.ts";
export { MIGRATIONS, migrate } from "./db/migrations.ts";
export type { MigrateOutcome, Migration } from "./db/migrations.ts";
export { likeArtistSchema, likeSchema } from "./domain/like.ts";
export type { Like } from "./domain/like.ts";
export {
  LIKE_RETRY_DELAYS_MS,
  LIKE_SEND_DELAY_MS,
  createLikesService,
  likeInputOf,
} from "./services/likes.ts";
export type { LikeInput, LikeOutcome, LikesService, LikesSyncOutcome } from "./services/likes.ts";
export { createErrorsService } from "./services/errors.ts";
export type { ErrorsService, PlaybackErrorReport, PlaybackErrorStage } from "./services/errors.ts";
export {
  PLAYBACK_ERROR_LIMITS,
  PLAYBACK_ERROR_MESSAGES,
  createPlaybackErrorReporter,
} from "./services/playbackErrors.ts";
export type { PlaybackDevice } from "./services/playbackErrors.ts";
