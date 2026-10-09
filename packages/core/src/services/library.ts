// INFO: the library service: the caller's unified library, a page at a time, over the shared paginated helper; the first page starts with the fixed liked entry. Also the saved read, the add and the remove of one item, and the two builders of the add body.
import { z } from "zod";

import type { Album } from "../domain/album.ts";
import {
  libraryEntrySchema,
  libraryItemSchema,
  librarySavedStateSchema,
  type libraryEntryKindSchema,
  type LibraryEntry,
  type LibraryItem,
  type LibrarySavedState,
} from "../domain/library.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export type LibraryItemKind = z.infer<typeof libraryEntryKindSchema>;

export interface LibraryItemInput {
  readonly kind: LibraryItemKind;
  readonly external_id: string;
  readonly title: string;
  readonly source: "genre" | "replay" | "presenting" | "external";
  readonly thumbnail_url?: string;
  readonly artist?: string;
  readonly artist_id?: string;
  readonly album_id?: string;
  readonly album_name?: string;
}

// The body POST /library takes for an album; each optional field only when it has a value.
export function albumLibraryInputOf(
  externalId: string,
  album: Album,
  artist: string | null,
): LibraryItemInput {
  const artistId = album.artists[0]?.id ?? null;
  return {
    kind: "album",
    source: "external",
    external_id: externalId,
    title: album.title,
    album_id: externalId,
    album_name: album.title,
    ...(album.thumbnail_url !== null ? { thumbnail_url: album.thumbnail_url } : {}),
    ...(artist !== null ? { artist } : {}),
    ...(artistId !== null ? { artist_id: artistId } : {}),
  };
}

// The body POST /library takes for a genre playlist: no artist, the backend shows its own name.
export function genrePlaylistLibraryInputOf(
  externalId: string,
  title: string,
  thumbnailUrl: string | null,
): LibraryItemInput {
  return {
    kind: "playlist",
    source: "genre",
    external_id: externalId,
    title,
    ...(thumbnailUrl !== null ? { thumbnail_url: thumbnailUrl } : {}),
  };
}

export interface LibraryService {
  listLibrary(cursor: string | null): Promise<HttpOutcome<PageResult<LibraryEntry>>>;
  getSavedState(kind: LibraryItemKind, externalId: string): Promise<HttpOutcome<LibrarySavedState>>;
  saveItem(input: LibraryItemInput): Promise<HttpOutcome<LibraryItem>>;
  // library_item_not_found comes back as the api failure it is; the caller decides what it means.
  removeItem(kind: LibraryItemKind, externalId: string): Promise<HttpOutcome<null>>;
}

function itemPath(kind: LibraryItemKind, externalId: string): string {
  return `/library/${encodeURIComponent(kind)}/${encodeURIComponent(externalId)}`;
}

export function createLibraryService(client: HttpClient): LibraryService {
  return {
    listLibrary: (cursor) =>
      fetchPage(client, { path: "/library", item: libraryEntrySchema, cursor }),
    getSavedState: (kind, externalId) =>
      client.request({ path: itemPath(kind, externalId), schema: librarySavedStateSchema }),
    saveItem: (input) =>
      client.request({
        method: "POST",
        path: "/library",
        body: input,
        schema: libraryItemSchema,
      }),
    removeItem: (kind, externalId) =>
      client.request({
        method: "DELETE",
        path: itemPath(kind, externalId),
        schema: z.null(),
      }),
  };
}
