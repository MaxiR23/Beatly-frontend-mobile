// INFO: the expected-empty state: an icon, a message and an optional action.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Button } from "./Button.tsx";
import { Icon, type IconName } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface EmptyStateProps {
  icon: IconName;
  message: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      <Icon name={icon} size="hero" tone="tertiary" />
      <Text variant="body" tone="secondary" align="center">
        {message}
      </Text>
      {action ? <Button variant="secondary" label={action.label} onPress={action.onPress} /> : null}
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
