// INFO: the mini player over the playback state: nothing while no track is loaded, otherwise the pill with the track, its error line on a failure, play or pause, next, and a tap that opens the player; it draws bare when the system provides the surface (the iOS 26+ accessory); it holds no state of its own.
import { MiniPlayer } from "@beatly/ui/native";
import { useRouter } from "expo-router";

import { useT } from "../../adapters/i18n.ts";
import { useDominantColor } from "../detail/useDominantColor.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

export function MiniPlayerBar({ surface = "glass" }: { surface?: "glass" | "bare" }) {
  const t = useT("player");
  const router = useRouter();
  const playback = usePlaybackActions();
  const current = usePlayback((state) => state.current);
  const status = usePlayback((state) => state.status);
  const tint = useDominantColor(current?.coverUrl ?? null);

  if (current === null) return null;
  const failed = status === "failed";

  return (
    <MiniPlayer
      title={current.title}
      subtitle={
        failed
          ? t("error.unplayable")
          : current.artists.map((artist) => artist.name).join(t("artistSeparator"))
      }
      failed={failed}
      coverUrl={current.coverUrl}
      tint={tint}
      surface={surface}
      playing={status === "playing"}
      busy={status === "loading"}
      labels={{ open: t("open"), play: t("play"), pause: t("pause"), next: t("next") }}
      onOpen={() => {
        router.push("/player");
      }}
      onToggle={() => {
        void playback.toggle();
      }}
      onNext={() => {
        void playback.next();
      }}
    />
  );
}
