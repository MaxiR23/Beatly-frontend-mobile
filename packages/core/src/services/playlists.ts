// INFO: the playlists service: the caller's own playlists, a page at a time, over the shared paginated helper.
import { playlistListItemSchema, type PlaylistListItem } from "../domain/playlist.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface PlaylistsService {
  listPlaylists(cursor: string | null): Promise<HttpOutcome<PageResult<PlaylistListItem>>>;
}

export function createPlaylistsService(client: HttpClient): PlaylistsService {
  return {
    listPlaylists: (cursor) =>
      fetchPage(client, { path: "/playlists", item: playlistListItemSchema, cursor }),
  };
}
