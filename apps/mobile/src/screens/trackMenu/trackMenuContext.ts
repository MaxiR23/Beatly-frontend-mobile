// INFO: what the TrackMenuHost gives the track rows and the menu sheets: the open, select and like actions. It lives apart from the host so the host and the sheet it mounts do not import each other.
import type { PlayableTrack } from "@beatly/core";
import { createContext, useContext } from "react";

import type { TrackMenuItem } from "./trackMenuItems.ts";

interface TrackMenuContextValue {
  ownPlaylistId: string | null;
  openMenu: (track: PlayableTrack) => void;
  select: (item: TrackMenuItem, track: PlayableTrack) => void;
  toggleLike: (track: PlayableTrack) => Promise<void>;
}

export const TrackMenuContext = createContext<TrackMenuContextValue | null>(null);

export function useTrackMenu(): TrackMenuContextValue {
  const value = useContext(TrackMenuContext);
  if (value === null) throw new Error("useTrackMenu outside TrackMenuHost");
  return value;
}
