// INFO: the tracks service: GET /tracks/{id}/upnext, /lyrics, /related and /credits over the single HTTP client; not paginated, each payload comes whole.
import {
  trackCreditsSchema,
  trackLyricsSchema,
  trackRelatedSchema,
  upNextSchema,
  type TrackCredits,
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
  getCredits(trackId: string): Promise<HttpOutcome<TrackCredits>>;
}

export function createTracksService(client: HttpClient): TracksService {
  const path = (id: string, leaf: string): string => `/tracks/${encodeURIComponent(id)}/${leaf}`;
  return {
    getUpNext: (id) => client.request({ path: path(id, "upnext"), schema: upNextSchema }),
    getLyrics: (id) => client.request({ path: path(id, "lyrics"), schema: trackLyricsSchema }),
    getRelated: (id) => client.request({ path: path(id, "related"), schema: trackRelatedSchema }),
    getCredits: (id) => client.request({ path: path(id, "credits"), schema: trackCreditsSchema }),
  };
}
