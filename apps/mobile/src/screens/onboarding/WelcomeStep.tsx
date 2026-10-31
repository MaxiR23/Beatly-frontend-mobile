// INFO: step 3 of the onboarding: up to five overlapped round photos of the picked artists, the greeting by name (or without it), the text and the Get started button, the three blocks entering in a cascade.
import { border, color, layout, radius, spacing } from "@beatly/ui";
import { Button, Cascade, Cover, Text } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import type { PickedArtist } from "./onboardingRules.ts";

interface WelcomeStepProps {
  readonly artists: readonly PickedArtist[];
  readonly name: string | null;
  readonly onStart: () => void;
  readonly reduceMotion: boolean;
}

export function WelcomeStep({ artists, name, onStart, reduceMotion }: WelcomeStepProps) {
  const t = useT("onboarding");
  const insets = useSafeAreaInsets();
  return (
    <View testID="welcome" style={styles.screen}>
      <View style={styles.content}>
        <Cascade reduceMotion={reduceMotion}>
          <View style={styles.photos}>
            {artists.map((artist, index) => (
              <View
                key={artist.id}
                testID="welcome-photo"
                style={[styles.photo, index > 0 ? styles.overlap : null]}
              >
                <Cover
                  images={artist.image ? [artist.image] : []}
                  shape="round"
                  size={layout.welcomePhoto}
                />
              </View>
            ))}
          </View>
          <Text variant="display">
            {name ? t("welcome.greeting", { name }) : t("welcome.greetingNoName")}
          </Text>
          <Text tone="secondary">{t("welcome.text")}</Text>
        </Cascade>
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + layout.gutter }]}>
        <Button variant="primary" label={t("welcome.start")} onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: spacing.lg,
    paddingHorizontal: layout.gutter,
  },
  photos: { flexDirection: "row" },
  photo: {
    borderWidth: border.widthFocused,
    borderColor: color.surface.base,
    borderRadius: radius.full,
  },
  overlap: { marginStart: -spacing.lg },
  footer: { paddingHorizontal: layout.gutter },
});
