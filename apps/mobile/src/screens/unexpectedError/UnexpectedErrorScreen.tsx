// INFO: the screen a route draws when rendering it throws (the route's ErrorBoundary export): the brand, a title, an apology that does not blame the user and Back to home, which goes to the home route and clears the error; the error is logged through the log port, never shown.
import { color, layout, spacing } from "@beatly/ui";
import { BeatlyLogo, Button, Text } from "@beatly/ui/native";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useCore } from "../../providers/CoreProvider.tsx";
import { useReduceMotion } from "../player/useReduceMotion.ts";

export function UnexpectedErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const tc = useT("common");
  const router = useRouter();
  const { log } = useCore();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    log.error("unexpected_error", { name: error.name, message: error.message });
  }, [log, error]);

  return (
    <SafeAreaView testID="unexpectedError" style={styles.screen}>
      <BeatlyLogo reduceMotion={reduceMotion} />
      <Text variant="brand" align="center">
        {tc("brand")}
      </Text>
      <Text variant="title" align="center">
        {tc("unexpected.title")}
      </Text>
      <Text tone="secondary" align="center">
        {tc("unexpected.body")}
      </Text>
      <Button
        variant="primary"
        label={tc("unexpected.home")}
        onPress={() => {
          router.replace("/");
          void retry();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.gutter,
    gap: spacing.xl,
    backgroundColor: color.surface.base,
  },
});
