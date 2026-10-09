// INFO: the options button of an own playlist's action row: the system menu on iOS where the native module exists, otherwise a button that opens the options sheet.
import { IconButton, NativeMenu, isNativeMenuAvailable } from "@beatly/ui/native";

import { useT } from "../../adapters/i18n.ts";
import { playlistOptions, type PlaylistOptionKey } from "./playlistOptions.ts";

interface PlaylistOptionsButtonProps {
  onSelect: (key: PlaylistOptionKey) => void;
  onOpenSheet: () => void;
}

export function PlaylistOptionsButton({ onSelect, onOpenSheet }: PlaylistOptionsButtonProps) {
  const t = useT("playlist");

  if (isNativeMenuAvailable()) {
    return (
      <NativeMenu
        accessibilityLabel={t("options.more")}
        items={playlistOptions.map((option) => ({
          key: option.key,
          label: t(option.labelKey),
          icon: option.icon,
          destructive: option.destructive,
          onSelect: () => {
            onSelect(option.key);
          },
        }))}
        testID="playlist-options"
      />
    );
  }
  return (
    <IconButton icon="ellipsis" accessibilityLabel={t("options.more")} onPress={onOpenSheet} />
  );
}
