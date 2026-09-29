// INFO: the search service: GET /search over the single HTTP client; not paginated.
import { searchResultSchema, type SearchResult } from "../domain/search.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export interface SearchService {
  search(query: string): Promise<HttpOutcome<SearchResult>>;
}

export function createSearchService(client: HttpClient): SearchService {
  return {
    search: (query) =>
      client.request({ path: "/search", query: { q: query }, schema: searchResultSchema }),
  };
}
