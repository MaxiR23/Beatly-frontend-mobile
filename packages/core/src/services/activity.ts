// INFO: the activity service: the caller's recent entities, a single page of at most 30 that never carries a cursor, over the shared paginated helper; and the two writes, a play and a recent.
import {
  playEventSchema,
  recentEntitySchema,
  type PlayEvent,
  type RecentEntity,
} from "../domain/activity.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface PlayArtist {
  readonly id: string;
  readonly name: string;
}

export interface PlayInput {
  readonly track_id: string;
  readonly title: string;
  // Non-empty: the counter never sends a play without one.
  readonly artists: readonly PlayArtist[];
  readonly album: string;
  readonly album_id: string;
  readonly thumbnail_url: string;
  readonly duration_seconds?: number;
}

interface RecentMetadataInput {
  readonly title: string;
  readonly subtitle: string | null;
  readonly thumbnail_url: string | null;
}

export type RecentInput =
  | {
      readonly entity_type: "album" | "artist";
      readonly entity_id: string;
      readonly metadata: RecentMetadataInput;
    }
  | {
      readonly entity_type: "playlist";
      readonly entity_id: string;
      readonly metadata: RecentMetadataInput & { readonly kind: "user" | "genre" | "liked" };
    };

export interface ActivityService {
  listRecents(): Promise<HttpOutcome<PageResult<RecentEntity>>>;
  logPlay(input: PlayInput): Promise<HttpOutcome<PlayEvent>>;
  registerRecent(input: RecentInput): Promise<HttpOutcome<RecentEntity>>;
}

export function createActivityService(client: HttpClient): ActivityService {
  return {
    listRecents: () => fetchPage(client, { path: "/recents", item: recentEntitySchema }),
    logPlay: (input) =>
      client.request({ method: "POST", path: "/plays", body: input, schema: playEventSchema }),
    registerRecent: (input) =>
      client.request({
        method: "POST",
        path: "/recents",
        body: input,
        schema: recentEntitySchema,
      }),
  };
}
