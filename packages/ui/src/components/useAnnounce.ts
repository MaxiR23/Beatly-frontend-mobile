// INFO: the one place a component announces a text to VoiceOver. On iOS, when the text appears or changes, or a new attempt repeats it (not on every render, not when it goes away) it calls AccessibilityInfo.announceForAccessibility; Android keeps accessibilityLiveRegion on the view and this does nothing there.
import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

import { isAndroidVariant } from "./platform.ts";

export function useAnnounce(text: string | undefined, attempt?: number): void {
  useEffect(() => {
    if (isAndroidVariant() || text === undefined || text === "") return;
    AccessibilityInfo.announceForAccessibility(text);
  }, [text, attempt]);
}
