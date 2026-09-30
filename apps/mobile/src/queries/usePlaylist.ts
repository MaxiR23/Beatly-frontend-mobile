// INFO: the query hooks of one playlist: its header by source and the tracks of own and liked through the shared infinite-query hook (a genre playlist's tracks come with its header); cache time comes from the outcome's max-age via the QueryClient.
import type { LikedPlaylist, PlaylistDetail, PublicGenrePlaylist } from "@beatly/core";
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { useInfiniteList } from "./useInfiniteList.ts";

export type PlaylistSource = "user" | "liked" | "genre";

export type PlaylistHeader =
  | { source: "user"; playlist: PlaylistDetail }
  | { source: "liked"; playlist: LikedPlaylist }
  | { source: "genre"; playlist: PublicGenrePlaylist };

export const playlistQueryKey = (source: PlaylistSource, id: string) =>
  ["playlist", source, id] as const;

export const playlistTracksQueryKey = (source: PlaylistSource, id: string) =>
  ["playlist", source, id, "tracks"] as const;

export function usePlaylistHeader(source: PlaylistSource, id: string) {
  const { playlists, publicShare } = useCore();
  return useQuery({
    queryKey: playlistQueryKey(source, id),
    queryFn: async () => {
      if (source === "genre") {
        const outcome = await publicShare.getGenrePlaylist(id);
        if (outcome.kind !== "success") throw new OutcomeError(outcome);
        return { ...outcome, data: { source, playlist: outcome.data } satisfies PlaylistHeader };
      }
      if (source === "liked") {
        const outcome = await playlists.getLikedPlaylist();
        if (outcome.kind !== "success") throw new OutcomeError(outcome);
        return { ...outcome, data: { source, playlist: outcome.data } satisfies PlaylistHeader };
      }
      const outcome = await playlists.getPlaylist(id);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return { ...outcome, data: { source, playlist: outcome.data } satisfies PlaylistHeader };
    },
    select: (outcome): PlaylistHeader => outcome.data,
  });
}

export function usePlaylistTracks(source: PlaylistSource, id: string) {
  const { playlists } = useCore();
  return useInfiniteList({
    queryKey: playlistTracksQueryKey(source, id),
    fetchPage: (cursor) =>
      source === "liked"
        ? playlists.listLikedTracks(cursor)
        : playlists.listPlaylistTracks(id, cursor),
    // A genre playlist's tracks arrive with its header, so the paged list never runs for it.
    enabled: source !== "genre",
  });
}
