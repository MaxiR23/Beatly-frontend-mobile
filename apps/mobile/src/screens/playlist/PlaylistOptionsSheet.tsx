// INFO: the options of an own playlist as a sheet, for Android and any build without the native menu: one action per option; choosing one closes the sheet first.
import { spacing } from "@beatly/ui";
import { ActionRow, Sheet } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { playlistOptions, type PlaylistOptionKey } from "./playlistOptions.ts";
import { useReduceMotion } from "../player/useReduceMotion.ts";

interface PlaylistOptionsSheetProps {
  visible: boolean;
  onClosed: () => void;
  onSelect: (key: PlaylistOptionKey) => void;
  onClose: () => void;
}

export function PlaylistOptionsSheet({
  visible,
  onClosed,
  onSelect,
  onClose,
}: PlaylistOptionsSheetProps) {
  const t = useT("playlist");
  const reduceMotion = useReduceMotion();
  const insets = useWindowInsets();

  return (
    <Sheet
      reduceMotion={reduceMotion}
      visible={visible}
      onClosed={onClosed}
      onClose={onClose}
      closeLabel={t("options.close")}
      bottomInset={insets.bottom}
    >
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
