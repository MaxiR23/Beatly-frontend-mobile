// INFO: the action row of a detail screen, centered: shuffle, the play button and an optional save toggle; the play button starts when idle and toggles when this list plays or is paused; while either start button loads the list's pages both are disabled, so a second start cannot race the first.
import { StyleSheet, View } from "react-native";

import { layout } from "../tokens/spacing.ts";
import { IconButton } from "./IconButton.tsx";
import { PlayButton, type PlayButtonState } from "./PlayButton.tsx";

interface DetailActionsProps {
  play: {
    // From the playback state of this list.
    state: PlayButtonState;
    label: string;
    pauseLabel: string;
    // The list's pages are loading for a play start.
    busy: boolean;
    onStart: () => void;
    onToggle: () => void;
  };
  shuffle: { label: string; busy: boolean; onPress: () => void };
  // No playable track.
  disabled: boolean;
  // Absent on own and liked playlists.
  save?: { label: string; saved: boolean; disabled: boolean; onPress: () => void };
  reduceMotion: boolean;
  testID?: string;
}

export function DetailActions({
  play,
  shuffle,
  disabled,
  save,
  reduceMotion,
  testID,
}: DetailActionsProps) {
  const startDisabled = disabled || play.busy || shuffle.busy;
  const playState: PlayButtonState = play.busy ? "loading" : play.state;
  return (
    <View style={styles.row} testID={testID}>
      <IconButton
        icon="shuffle"
        accessibilityLabel={shuffle.label}
        busy={shuffle.busy}
        disabled={startDisabled}
        onPress={shuffle.onPress}
      />
      <PlayButton
        state={playState}
        playLabel={play.label}
        pauseLabel={play.pauseLabel}
        disabled={startDisabled}
        reduceMotion={reduceMotion}
        onPress={playState === "idle" ? play.onStart : play.onToggle}
      />
      {save !== undefined ? (
        <IconButton
          icon={save.saved ? "check" : "plus"}
          accessibilityLabel={save.label}
          selected={save.saved}
          disabled={save.disabled}
          onPress={save.onPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.gutter,
    gap: layout.gap,
  },
});
