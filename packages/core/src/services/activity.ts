// INFO: the activity service: the caller's recent entities, a single page of at most 30 that never carries a cursor, over the shared paginated helper.
import { recentEntitySchema, type RecentEntity } from "../domain/activity.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface ActivityService {
  listRecents(): Promise<HttpOutcome<PageResult<RecentEntity>>>;
}

export function createActivityService(client: HttpClient): ActivityService {
  return {
    listRecents: () => fetchPage(client, { path: "/recents", item: recentEntitySchema }),
  };
}
