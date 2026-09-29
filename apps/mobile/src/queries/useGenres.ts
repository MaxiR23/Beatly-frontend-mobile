// INFO: the query hooks of the genres service: genres, a genre's playlists and its categories, each a single page that never grows; cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const genresQueryKey = ["genres"] as const;
export const genrePlaylistsQueryKey = (slug: string) => ["genres", slug, "playlists"] as const;
export const genreCategoriesQueryKey = (slug: string) => ["genres", slug, "categories"] as const;

export function useGenres() {
  const { genres } = useCore();
  return useQuery({
    queryKey: genresQueryKey,
    queryFn: async () => {
      const outcome = await genres.listGenres();
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data.items,
  });
}

export function useGenrePlaylists(slug: string) {
  const { genres } = useCore();
  return useQuery({
    queryKey: genrePlaylistsQueryKey(slug),
    queryFn: async () => {
      const outcome = await genres.listGenrePlaylists(slug);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data.items,
  });
}

export function useGenreCategories(slug: string) {
  const { genres } = useCore();
  return useQuery({
    queryKey: genreCategoriesQueryKey(slug),
    queryFn: async () => {
      const outcome = await genres.listGenreCategories(slug);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data.items,
  });
}
