// INFO: mounted once while signed in, draws nothing: whenever the next track of the queue changes (every track change), fetches its cover into the memory and disk cache at the size the player draws it, so a skip draws it at once; a failed prefetch is logged and changes nothing.
import { prefetchPicture } from "@beatly/ui/native";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";

import { useCore } from "../../providers/CoreProvider.tsx";
import { playerCoverSize } from "./playerCover.ts";
import { usePlayback } from "./usePlayback.ts";

export function NextCoverPrefetch() {
  const { log } = useCore();
  const { width } = useWindowDimensions();
  const next = usePlayback((s) => s.queue[s.index + 1] ?? null);

  useEffect(() => {
    if (next?.image == null) return;
    const { trackId } = next;
    void prefetchPicture(next.image, playerCoverSize(width)).then(
      (ok) => {
        if (!ok) log.warn("image.prefetch_failed", { trackId });
      },
      (error: unknown) => {
        log.warn("image.prefetch_failed", { trackId, message: String(error) });
      },
    );
  }, [log, next, width]);

  return null;
}
