// INFO: the options of an own playlist as a sheet, for Android and any build without the native menu: one action per option; choosing one closes the sheet first.
import { spacing } from "@beatly/ui";
import { ActionRow, Sheet } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { playlistOptions, type PlaylistOptionKey } from "./playlistOptions.ts";

interface PlaylistOptionsSheetProps {
  onSelect: (key: PlaylistOptionKey) => void;
  onClose: () => void;
}

export function PlaylistOptionsSheet({ onSelect, onClose }: PlaylistOptionsSheetProps) {
  const t = useT("playlist");
  const insets = useSafeAreaInsets();

  return (
    <Sheet visible onClose={onClose} closeLabel={t("options.close")} bottomInset={insets.bottom}>
      <View style={styles.body} testID="playlist-options-sheet">
        {playlistOptions.map((option) => (
          <ActionRow
            key={option.key}
            icon={option.icon}
            label={t(option.labelKey)}
            destructive={option.destructive}
            onPress={() => {
              onSelect(option.key);
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
