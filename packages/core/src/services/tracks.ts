// INFO: the tracks service: GET /tracks/{id}/upnext (with the source pair for an album, own, genre or liked source), /lyrics, /related and /credits over the single HTTP client; not paginated, each payload comes whole.
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
import type { PlaybackSource } from "./playback.ts";

// The up next params of a playback source (tracks.md, GET /tracks/{id}/upnext); null for a source the route does not take.
export interface UpNextSource {
  readonly kind: "album" | "playlist" | "genre_playlist" | "liked";
  readonly id: string;
}

export function upNextSourceOf(source: PlaybackSource | null): UpNextSource | null {
  if (source === null) return null;
  switch (source.kind) {
    case "album":
    case "playlist":
    case "genre_playlist":
      return { kind: source.kind, id: source.id };
    case "liked":
      return { kind: "liked", id: "liked" };
    case "artist":
    case "search":
    case "track":
      return null;
  }
}

export interface TracksService {
  getUpNext(trackId: string, source: PlaybackSource | null): Promise<HttpOutcome<UpNext>>;
  getLyrics(trackId: string): Promise<HttpOutcome<TrackLyrics>>;
  getRelated(trackId: string): Promise<HttpOutcome<TrackRelated>>;
  getCredits(trackId: string): Promise<HttpOutcome<TrackCredits>>;
}

export function createTracksService(client: HttpClient): TracksService {
  const path = (id: string, leaf: string): string => `/tracks/${encodeURIComponent(id)}/${leaf}`;
  return {
    getUpNext: (id, source) => {
      const up = upNextSourceOf(source);
      return client.request({
        path: path(id, "upnext"),
        query: { source_kind: up?.kind, source_id: up?.id },
        schema: upNextSchema,
      });
    },
    getLyrics: (id) => client.request({ path: path(id, "lyrics"), schema: trackLyricsSchema }),
    getRelated: (id) => client.request({ path: path(id, "related"), schema: trackRelatedSchema }),
    getCredits: (id) => client.request({ path: path(id, "credits"), schema: trackCreditsSchema }),
  };
}
