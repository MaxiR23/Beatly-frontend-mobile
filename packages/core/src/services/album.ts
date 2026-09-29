// INFO: the album service: GET /album/{id} over the single HTTP client; not paginated, the tracks and the referenced albums come whole.
import { albumSchema, type Album } from "../domain/album.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export interface AlbumService {
  getAlbum(id: string): Promise<HttpOutcome<Album>>;
}

export function createAlbumService(client: HttpClient): AlbumService {
  return {
    getAlbum: (id) =>
      client.request({ path: `/album/${encodeURIComponent(id)}`, schema: albumSchema }),
  };
}
