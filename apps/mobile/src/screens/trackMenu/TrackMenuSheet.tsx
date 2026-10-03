// INFO: the track menu as a sheet, for Android and any build without the native menu: the track as a header, then one action per item that applies; choosing one closes the sheet first.
import type { PlayableTrack } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { ActionRow, MediaRow, Sheet } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useIsLiked } from "../../queries/useLikes.ts";
import { useTrackMenu } from "./trackMenuContext.ts";
import { trackMenuItems } from "./trackMenuItems.ts";

interface TrackMenuSheetProps {
  track: PlayableTrack;
  onClose: () => void;
}

export function TrackMenuSheet({ track, onClose }: TrackMenuSheetProps) {
  const t = useT("trackMenu");
  const tp = useT("player");
  const insets = useSafeAreaInsets();
  const { ownPlaylistId, select } = useTrackMenu();
  const liked = useIsLiked(track.trackId);
  const items = trackMenuItems(track, { liked, ownPlaylistId });

  return (
    <Sheet visible onClose={onClose} closeLabel={t("close")} bottomInset={insets.bottom}>
      <View style={styles.body} testID="track-menu-sheet">
        <MediaRow
          shape="square"
          urls={track.coverUrl === null ? [] : [track.coverUrl]}
          title={track.title}
          subtitle={track.artists.map((artist) => artist.name).join(tp("artistSeparator"))}
        />
        {items.map((item) => (
          <ActionRow
            key={item.key}
            icon={item.icon}
            label={t(item.labelKey)}
            destructive={item.destructive}
            filled={item.key === "unlike"}
            onPress={() => {
              select(item, track);
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xs },
});
