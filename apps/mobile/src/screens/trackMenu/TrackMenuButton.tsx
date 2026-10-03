// INFO: the three-dots button of a track row or the player header: the system menu on iOS where the native module exists, otherwise a button that opens the sheet; both list only the items that apply to the track.
import type { PlayableTrack } from "@beatly/core";
import { IconButton, NativeMenu, isNativeMenuAvailable } from "@beatly/ui/native";

import { useT } from "../../adapters/i18n.ts";
import { useIsLiked } from "../../queries/useLikes.ts";
import { useTrackMenu } from "./trackMenuContext.ts";
import { trackMenuItems } from "./trackMenuItems.ts";

export function TrackMenuButton({ track }: { track: PlayableTrack }) {
  const t = useT("trackMenu");
  const { ownPlaylistId, openMenu, select } = useTrackMenu();
  const liked = useIsLiked(track.trackId);

  if (isNativeMenuAvailable()) {
    return (
      <NativeMenu
        accessibilityLabel={t("more")}
        items={trackMenuItems(track, { liked, ownPlaylistId }).map((item) => ({
          key: item.key,
          label: t(item.labelKey),
          icon: item.icon,
          destructive: item.destructive,
          onSelect: () => {
            select(item, track);
          },
        }))}
      />
    );
  }
  return (
    <IconButton
      icon="ellipsis"
      accessibilityLabel={t("more")}
      onPress={() => {
        openMenu(track);
      }}
    />
  );
}
