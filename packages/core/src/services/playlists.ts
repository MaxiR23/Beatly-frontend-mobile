// INFO: the playlists service: the caller's own playlists, a page at a time, over the shared paginated helper, and the creation of a playlist.
import {
  playlistListItemSchema,
  playlistSchema,
  type Playlist,
  type PlaylistListItem,
} from "../domain/playlist.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface CreatePlaylistInput {
  readonly title: string;
  readonly description?: string;
  readonly is_public: boolean;
}

export interface PlaylistsService {
  listPlaylists(cursor: string | null): Promise<HttpOutcome<PageResult<PlaylistListItem>>>;
  createPlaylist(input: CreatePlaylistInput): Promise<HttpOutcome<Playlist>>;
}

export function createPlaylistsService(client: HttpClient): PlaylistsService {
  return {
    listPlaylists: (cursor) =>
      fetchPage(client, { path: "/playlists", item: playlistListItemSchema, cursor }),
    createPlaylist: ({ title, description, is_public }) =>
      client.request({
        method: "POST",
        path: "/playlists",
        body: { title, is_public, ...(description !== undefined ? { description } : {}) },
        schema: playlistSchema,
      }),
  };
}
