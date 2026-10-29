// INFO: the track menu as a sheet, for Android and any build without the native menu: the track as a header, then one action per item that applies; choosing one closes the sheet first.
import type { PlayableTrack } from "@beatly/core";
import { color, spacing } from "@beatly/ui";
import { ActionRow, MediaRow, Sheet, border, isAndroidVariant } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { useIsLiked } from "../../queries/useLikes.ts";
import { useTrackMenu } from "./trackMenuContext.ts";
import { trackMenuItems } from "./trackMenuItems.ts";
import { useReduceMotion } from "../player/useReduceMotion.ts";

interface TrackMenuSheetProps {
  visible: boolean;
  onClosed: () => void;
  track: PlayableTrack;
  onClose: () => void;
}

export function TrackMenuSheet({ visible, onClosed, track, onClose }: TrackMenuSheetProps) {
  const t = useT("trackMenu");
  const reduceMotion = useReduceMotion();
  const tp = useT("player");
  const insets = useWindowInsets();
  const { ownPlaylistId, select } = useTrackMenu();
  const liked = useIsLiked(track.trackId);
  const android = isAndroidVariant();
  const header = (size: "regular" | "menu") => (
    <MediaRow
      shape="square"
      size={size}
      images={track.image === null ? [] : [track.image]}
      title={track.title}
      subtitle={track.artists.map((artist) => artist.name).join(tp("artistSeparator"))}
    />
  );
  const items = trackMenuItems(track, { liked, ownPlaylistId });

  return (
    <Sheet
      reduceMotion={reduceMotion}
      visible={visible}
      onClosed={onClosed}
      onClose={onClose}
      closeLabel={t("close")}
      bottomInset={insets.bottom}
    >
      <View style={styles.body} testID="track-menu-sheet">
        {android ? (
          <View style={styles.headerAndroid} testID="track-menu-sheet-header">
            {header("menu")}
            <View style={styles.divider} testID="track-menu-sheet-divider" />
          </View>
        ) : (
          header("regular")
        )}
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
  // Full width inside the Android sheet; the MediaRow's own gutter puts the cover 16 from the edge.
  headerAndroid: { marginHorizontal: -spacing.xl },
  // With the body's spacing.xs gap, the 8 below the divider.
  divider: {
    borderBottomWidth: border.hairline,
    borderBottomColor: color.surface.border,
    marginBottom: spacing.xs,
  },
});
