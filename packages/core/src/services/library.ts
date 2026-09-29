// INFO: the library service: the caller's unified library, a page at a time, over the shared paginated helper; the first page starts with the fixed liked entry.
import { libraryEntrySchema, type LibraryEntry } from "../domain/library.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface LibraryService {
  listLibrary(cursor: string | null): Promise<HttpOutcome<PageResult<LibraryEntry>>>;
}

export function createLibraryService(client: HttpClient): LibraryService {
  return {
    listLibrary: (cursor) =>
      fetchPage(client, { path: "/library", item: libraryEntrySchema, cursor }),
  };
}
