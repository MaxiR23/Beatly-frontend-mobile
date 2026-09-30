// INFO: the public service: the header of a genre playlist, from the public domain of the API.
import { publicGenrePlaylistSchema, type PublicGenrePlaylist } from "../domain/public.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export interface PublicService {
  getGenrePlaylist(id: string): Promise<HttpOutcome<PublicGenrePlaylist>>;
}

export function createPublicService(client: HttpClient): PublicService {
  return {
    getGenrePlaylist: (id) =>
      client.request({
        path: `/public/genre-playlists/${encodeURIComponent(id)}`,
        schema: publicGenrePlaylistSchema,
      }),
  };
}
