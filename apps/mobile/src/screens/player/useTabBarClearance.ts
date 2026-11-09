// INFO: the space a tab screen leaves at its bottom: the tab bar's clearance, plus the mini player's when a track is loaded and the status strip's while one shows, from the window's bottom inset (the clearance draws the bar itself, so a native tab's inset, which already holds the tab bar, would count it twice).
import { floatingTabBarClearance } from "@beatly/ui/native";

import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { useBottomStatus } from "../connection/BottomStatus.tsx";
import { usePlayback } from "./usePlayback.ts";

export function useTabBarClearance(): number {
  const insets = useWindowInsets();
  const hasTrack = usePlayback((state) => state.current !== null);
  const { kind } = useBottomStatus();
  return floatingTabBarClearance(insets.bottom, hasTrack, kind !== null);
}
