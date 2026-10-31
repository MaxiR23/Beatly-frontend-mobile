// INFO: step 2 of the onboarding: the logo, the title and the phrases that advance while the home is built, on the base surface; when the build failed, the generic error with retry.
import { color, spacing } from "@beatly/ui";
import { BeatlyLogo, ErrorState, PhraseCycle, Text } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";

interface BuildingHomeStepProps {
  readonly artistName: string;
  readonly failed: boolean;
  readonly onRetry: () => void;
  readonly reduceMotion: boolean;
}

export function BuildingHomeStep({
  artistName,
  failed,
  onRetry,
  reduceMotion,
}: BuildingHomeStepProps) {
  const t = useT("onboarding");
  const tc = useT("common");
  if (failed) {
    return (
      <View testID="buildingHome" style={styles.screen}>
        <ErrorState message={tc("error.generic")} retryLabel={tc("retry")} onRetry={onRetry} />
      </View>
    );
  }
  return (
    <View testID="buildingHome" style={styles.screen}>
      <BeatlyLogo reduceMotion={reduceMotion} />
      <Text variant="title" align="center">
        {t("building.title")}
      </Text>
      <View style={styles.phrases}>
        <PhraseCycle
          reduceMotion={reduceMotion}
          phrases={[
            t("building.phrases.similar", { artist: artistName }),
            t("building.phrases.albums"),
            t("building.phrases.almost"),
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    backgroundColor: color.surface.base,
  },
  phrases: { marginTop: spacing.xl },
});
