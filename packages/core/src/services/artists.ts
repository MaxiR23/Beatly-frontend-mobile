// INFO: the artists service: GET /artist/{id} over the single HTTP client; not paginated, the four lists come whole.
import { artistSchema, type Artist } from "../domain/artist.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export interface ArtistsService {
  getArtist(id: string): Promise<HttpOutcome<Artist>>;
}

export function createArtistsService(client: HttpClient): ArtistsService {
  return {
    getArtist: (id) =>
      client.request({ path: `/artist/${encodeURIComponent(id)}`, schema: artistSchema }),
  };
}
