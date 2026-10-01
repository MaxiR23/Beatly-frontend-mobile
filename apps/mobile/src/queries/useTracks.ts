// INFO: the query hooks of GET /tracks/{id}/upnext, /lyrics and /related, one cache entry per track; their cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const upNextQueryKey = (trackId: string) => ["track", trackId, "upnext"] as const;
export const lyricsQueryKey = (trackId: string) => ["track", trackId, "lyrics"] as const;
export const relatedQueryKey = (trackId: string) => ["track", trackId, "related"] as const;

export function useUpNext(trackId: string) {
  const { tracks } = useCore();
  return useQuery({
    queryKey: upNextQueryKey(trackId),
    queryFn: async () => {
      const outcome = await tracks.getUpNext(trackId);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

export function useLyrics(trackId: string) {
  const { tracks } = useCore();
  return useQuery({
    queryKey: lyricsQueryKey(trackId),
    queryFn: async () => {
      const outcome = await tracks.getLyrics(trackId);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

export function useRelated(trackId: string) {
  const { tracks } = useCore();
  return useQuery({
    queryKey: relatedQueryKey(trackId),
    queryFn: async () => {
      const outcome = await tracks.getRelated(trackId);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}
