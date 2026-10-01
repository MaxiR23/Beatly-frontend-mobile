// INFO: the tracks service: GET /tracks/{id}/upnext, /lyrics and /related over the single HTTP client; not paginated, each payload comes whole.
import {
  trackLyricsSchema,
  trackRelatedSchema,
  upNextSchema,
  type TrackLyrics,
  type TrackRelated,
  type UpNext,
} from "../domain/track.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export interface TracksService {
  getUpNext(trackId: string): Promise<HttpOutcome<UpNext>>;
  getLyrics(trackId: string): Promise<HttpOutcome<TrackLyrics>>;
  getRelated(trackId: string): Promise<HttpOutcome<TrackRelated>>;
}

export function createTracksService(client: HttpClient): TracksService {
  const path = (id: string, leaf: string): string => `/tracks/${encodeURIComponent(id)}/${leaf}`;
  return {
    getUpNext: (id) => client.request({ path: path(id, "upnext"), schema: upNextSchema }),
    getLyrics: (id) => client.request({ path: path(id, "lyrics"), schema: trackLyricsSchema }),
    getRelated: (id) => client.request({ path: path(id, "related"), schema: trackRelatedSchema }),
  };
}
