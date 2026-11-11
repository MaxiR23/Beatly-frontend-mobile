// INFO: the releases service: the new releases, a page at a time, over the shared paginated helper.
import { newReleaseSchema, type NewRelease } from "../domain/release.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface ReleasesService {
  listReleases(cursor: string | null): Promise<HttpOutcome<PageResult<NewRelease>>>;
}

export function createReleasesService(client: HttpClient): ReleasesService {
  return {
    listReleases: (cursor) =>
      fetchPage(client, { path: "/releases", item: newReleaseSchema, cursor }),
  };
}
