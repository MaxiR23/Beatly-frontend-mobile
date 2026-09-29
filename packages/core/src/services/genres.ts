// INFO: the genres service: genres, a genre's curated playlists and its categories, each a single page that never carries a cursor, over the shared paginated helper.
import {
  genreCategorySchema,
  genrePlaylistListItemSchema,
  genreSchema,
  type Genre,
  type GenrePlaylistListItem,
} from "../domain/genre.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface GenresService {
  listGenres(): Promise<HttpOutcome<PageResult<Genre>>>;
  listGenrePlaylists(slug: string): Promise<HttpOutcome<PageResult<GenrePlaylistListItem>>>;
  listGenreCategories(slug: string): Promise<HttpOutcome<PageResult<string>>>;
}

export function createGenresService(client: HttpClient): GenresService {
  return {
    listGenres: () => fetchPage(client, { path: "/genres", item: genreSchema }),
    listGenrePlaylists: (slug) =>
      fetchPage(client, {
        path: `/genres/${encodeURIComponent(slug)}/playlists`,
        item: genrePlaylistListItemSchema,
      }),
    listGenreCategories: (slug) =>
      fetchPage(client, {
        path: `/genres/${encodeURIComponent(slug)}/categories`,
        item: genreCategorySchema,
      }),
  };
}
