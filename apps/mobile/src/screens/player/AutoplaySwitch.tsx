// INFO: the autoplay switch at the top of up next: the stored setting in a SwitchRow; a failed read draws the error with retry, a failed write the generic error line; nothing while the first read is pending (the root Autoplay has read it already).
import { layout, spacing } from "@beatly/ui";
import { SwitchRow, ErrorText } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { queryFailure } from "../../queries/failureCause.ts";
import { useAutoplaySetting, useSetAutoplay } from "../../queries/useAutoplay.ts";
import { FailureState } from "../failure/FailureState.tsx";

interface AutoplaySwitchProps {
  reduceMotion: boolean;
}

export function AutoplaySwitch({ reduceMotion }: AutoplaySwitchProps) {
  const t = useT("player");
  const tc = useT("common");
  const setting = useAutoplaySetting();
  const set = useSetAutoplay();

  const failure = queryFailure(setting);
  if (failure !== null) {
    return (
      <View style={styles.row}>
        <FailureState cause={failure} onRetry={() => void setting.refetch()} />
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
      {set.isError ? <ErrorText message={tc("error.generic")} attempt={set.submittedAt} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: layout.gutter, paddingVertical: spacing.sm, gap: spacing.xxs },
});
