// INFO: the action row of a detail screen. Centered (own, album, genre): shuffle, the play button and a side button (save or the options node) as a group centered with layout.actionGap, so the side buttons follow the play pill as it shrinks. Wide (liked): a play pill and a shuffle pill sharing the row with layout.gap; the play pill swaps its glyph and label with the state and never shrinks. The play control starts when idle and toggles when this list plays or is paused; while either start loads the list's pages both are disabled, so a second start cannot race the first.
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { layout } from "../tokens/spacing.ts";
import { Button } from "./Button.tsx";
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
  // Absent on own and liked playlists; centered only.
  save?: { label: string; saved: boolean; disabled: boolean; onPress: () => void };
  // The own playlist's options button, after play; centered only.
  options?: ReactNode;
  reduceMotion: boolean;
  // centered: shuffle, play and the side button as a centered group (own, album, genre); wide: the liked playlist's play and shuffle pills sharing the row, with no side button.
  variant?: "centered" | "wide";
  testID?: string;
}

export function DetailActions({
  play,
  shuffle,
  disabled,
  save,
  options,
  reduceMotion,
  variant = "centered",
  testID,
}: DetailActionsProps) {
  const startDisabled = disabled || play.busy || shuffle.busy;
  const playState: PlayButtonState = play.busy ? "loading" : play.state;
  if (variant === "wide") {
    return (
      <View style={styles.wide} testID={testID}>
        <Button
          variant="primary"
          fill
          icon={playState === "playing" ? "pause" : "play"}
          label={playState === "playing" ? play.pauseLabel : play.label}
          loading={playState === "loading"}
          disabled={startDisabled}
          onPress={playState === "idle" ? play.onStart : play.onToggle}
        />
        <Button
          variant="secondary"
          fill
          icon="shuffle"
          label={shuffle.label}
          loading={shuffle.busy}
          disabled={startDisabled}
          onPress={shuffle.onPress}
        />
      </View>
    );
  }
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
      ) : (
        options
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.gutter,
    gap: layout.actionGap,
  },
  wide: {
    flexDirection: "row",
    paddingHorizontal: layout.gutter,
    gap: layout.gap,
  },
});
