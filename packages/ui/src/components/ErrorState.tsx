// INFO: the error state with retry: a round mark with the glyph of the cause (offline, slow, server), the title, the explanation and Retry, announced to screen readers; the caller passes every text already translated, never a raw reason.
import { StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Button } from "./Button.tsx";
import { Icon, type IconName } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { useAnnounce } from "./useAnnounce.ts";

export type ErrorCause = "offline" | "slow" | "server";

interface ErrorStateProps {
  cause: ErrorCause;
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

const glyphOf: Record<ErrorCause, IconName> = {
  offline: "wifiOff",
  slow: "clock",
  server: "alert",
};

export function ErrorState({ cause, title, message, retryLabel, onRetry }: ErrorStateProps) {
  useAnnounce(`${title}. ${message}`);
  return (
    <View style={styles.box}>
      <View style={styles.mark} testID="error-state-mark">
        <Icon name={glyphOf[cause]} size="xl" tone="secondary" />
      </View>
      <View
        style={styles.texts}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID="error-state-texts"
      >
        <Text variant="subtitle" tone="primary" align="center">
          {title}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {message}
        </Text>
      </View>
      <Button variant="primary" label={retryLabel} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.gutter,
    gap: spacing.md,
  },
  mark: {
    width: icon.size.hero,
    height: icon.size.hero,
    borderRadius: radius.full,
    backgroundColor: color.overlay.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { alignItems: "center", gap: spacing.xs },
});
