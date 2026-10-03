// INFO: reads the likes mirror: useIsLiked re-renders when a toggle, a revert or a sync changes the answer for one track, and useLikesActions returns the service; the mirror is the cache (likes.md), so there is no query and no cache time here.
import type { LikesService } from "@beatly/core";
import { useSyncExternalStore } from "react";

import { useCore } from "../providers/CoreProvider.tsx";

export function useIsLiked(trackId: string): boolean {
  const { likes } = useCore();
  return useSyncExternalStore(
    (listener) => likes.subscribe(listener),
    () => likes.isLiked(trackId),
  );
}

export function useLikesActions(): LikesService {
  return useCore().likes;
}
