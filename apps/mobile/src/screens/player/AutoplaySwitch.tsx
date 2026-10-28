// INFO: the autoplay switch at the top of up next: the stored setting in a SwitchRow; a failed read draws the error with retry, a failed write the generic error line; nothing while the first read is pending (the root Autoplay has read it already).
import { layout, spacing } from "@beatly/ui";
import { ErrorState, SwitchRow, Text } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useAutoplaySetting, useSetAutoplay } from "../../queries/useAutoplay.ts";

interface AutoplaySwitchProps {
  reduceMotion: boolean;
}

export function AutoplaySwitch({ reduceMotion }: AutoplaySwitchProps) {
  const t = useT("player");
  const tc = useT("common");
  const setting = useAutoplaySetting();
  const set = useSetAutoplay();

  if (setting.isError) {
    return (
      <View style={styles.row}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => void setting.refetch()}
        />
      </View>
    );
  }
  if (setting.data === undefined) return null;
  return (
    <View style={styles.row} testID="player-sheet-autoplay">
      <SwitchRow
        label={t("sheet.autoplay")}
        helper={t("sheet.autoplayHelper")}
        value={setting.data}
        onValueChange={(on) => {
          set.mutate(on);
        }}
        reduceMotion={reduceMotion}
      />
      {set.isError ? (
        <Text variant="meta" tone="error">
          {tc("error.generic")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: layout.gutter, paddingVertical: spacing.sm, gap: spacing.xxs },
});
