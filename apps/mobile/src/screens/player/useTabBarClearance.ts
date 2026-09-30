// INFO: the space a tab screen leaves at its bottom: the floating bar's clearance, plus the mini player's when a track is loaded.
import { floatingTabBarClearance } from "@beatly/ui/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePlayback } from "./usePlayback.ts";

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  const hasTrack = usePlayback((state) => state.current !== null);
  return floatingTabBarClearance(insets.bottom, hasTrack);
}
