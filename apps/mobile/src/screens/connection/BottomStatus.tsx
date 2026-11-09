// INFO: the status strip over the app's bottom: offline, or a failed track with its reason; a tap on a playback strip retries (the play-all that could not start offline, or the track), never by itself when the connection returns. BottomStatusOverlay draws it for the iOS 26+ native tab bar, which has no slot for it, at the floating bar's stack height plus the mini player's.
import { layout, spacing } from "@beatly/ui";
import { floatingTabBarStackHeight, StatusStrip } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useOnline } from "../../queries/useOnline.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { usePlayback, usePlaybackActions } from "../player/usePlayback.ts";
import { bottomStatusOf, type BottomStatusKind } from "./bottomStatus.ts";
import { retryPlayStart, usePlayStartSource } from "./playStart.ts";

export function useBottomStatus(): { kind: BottomStatusKind | null; startFailed: boolean } {
  const online = useOnline();
  const failure = usePlayback((s) => (s.status === "failed" ? s.failure : null));
  const sourceStart = usePlayback((s) => s.sourceStart);
  const started = usePlayStartSource();
  const startFailed = started !== null && started === sourceStart;
  return { kind: bottomStatusOf(online, failure, startFailed), startFailed };
}

export function BottomStatus() {
  const t = useT("player");
  const tc = useT("common");
  const playback = usePlaybackActions();
  const { kind, startFailed } = useBottomStatus();
  if (kind === null) return null;
  const retry = () => {
    if (startFailed) retryPlayStart();
    else void playback.retry();
  };
  switch (kind) {
    case "offline":
      return (
        <StatusStrip testID="status-strip" icon="wifiOff" message={tc("connection.offline")} />
      );
    case "playbackOffline":
      return (
        <StatusStrip
          testID="status-strip"
          icon="wifiOff"
          message={t("strip.offline")}
          onPress={retry}
        />
      );
    case "playbackSlow":
      return (
        <StatusStrip testID="status-strip" icon="alert" message={t("strip.slow")} onPress={retry} />
      );
    case "playbackFailed":
      return (
        <StatusStrip
          testID="status-strip"
          icon="alert"
          message={t("strip.failed")}
          onPress={retry}
        />
      );
  }
}

export function BottomStatusOverlay() {
  const insets = useWindowInsets();
  const hasTrack = usePlayback((s) => s.current !== null);
  const { kind } = useBottomStatus();
  if (kind === null) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        { bottom: floatingTabBarStackHeight(insets.bottom, hasTrack) + spacing.xs },
      ]}
    >
      <BottomStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", left: layout.gutter, right: layout.gutter },
});
