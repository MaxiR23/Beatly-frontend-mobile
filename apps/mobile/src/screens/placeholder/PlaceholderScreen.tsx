// INFO: the stand-in for a tab whose screen has not been ported yet.
import { color } from "@beatly/ui";
import { EmptyState, type IconName } from "@beatly/ui/native";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";

interface PlaceholderScreenProps {
  icon: IconName;
  testID: string;
}

export function PlaceholderScreen({ icon, testID }: PlaceholderScreenProps) {
  const t = useT("tabs");
  return (
    <SafeAreaView testID={testID} style={styles.screen}>
      <EmptyState icon={icon} message={t("placeholder")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
});
