// INFO: the error state with retry; the caller passes the message and the
// retry label already translated, never a raw reason.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Button } from "./Button.tsx";
import { Text } from "./Text.tsx";

interface ErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({ message, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.box}>
      <Text variant="body" tone="secondary" align="center">
        {message}
      </Text>
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
});
