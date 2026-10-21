// INFO: whether the sheet handle nudges on this opening of the player: asks the core's sheet nudge service once per mount, at the first known track, so a track already nudged in this session does not nudge, and a track change while the player is open does not ask again.
import { useEffect, useRef, useState } from "react";

import { useCore } from "../../providers/CoreProvider.tsx";

export function useSheetNudge(trackId: string | null): boolean {
  const { sheetNudge } = useCore();
  const [nudge, setNudge] = useState(false);
  const decided = useRef(false);
  useEffect(() => {
    if (decided.current || trackId === null) return;
    decided.current = true;
    if (sheetNudge.take(trackId)) setNudge(true);
  }, [sheetNudge, trackId]);
  return nudge;
}
