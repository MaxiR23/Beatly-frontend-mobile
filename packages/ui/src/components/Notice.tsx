// INFO: a brief message, announced politely to screen readers. Inline and on iOS: a check or an x and one meta line in the success or error tone, floating on a glass bar. Floating on Android: the Material 3 snackbar (ADR 027), an inverse surface with extra-small corners, the message from the start and an optional action at the end; iOS does not draw the action yet.
import { Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";

interface NoticeProps {
  tone: "success" | "error";
  message: string;
  floating?: boolean;
  // A translated label and its callback, drawn at the end of the Android snackbar; iOS does not draw it yet (issue 116 keeps iOS as it is).
  action?: NoticeAction;
  testID?: string;
}

interface NoticeAction {
  label: string;
  onPress: () => void;
}

export function Notice({ tone, message, floating = false, action, testID }: NoticeProps) {
  if (floating && isAndroidVariant()) {
    return <Snackbar message={message} action={action} testID={testID} />;
  }
  const row = (
    <View
      style={styles.row}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Icon name={tone === "success" ? "check" : "x"} size="md" tone={tone} />
      <Text variant="meta" tone="primary">
        {message}
      </Text>
    </View>
  );
  return floating ? <GlassSurface variant="bar">{row}</GlassSurface> : row;
}

interface SnackbarProps {
  message: string;
  action?: NoticeAction | undefined;
  testID?: string | undefined;
}

function Snackbar({ message, action, testID }: SnackbarProps) {
  return (
    <View
      style={[styles.snackbar, action !== undefined && styles.snackbarWithAction]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <View style={styles.message}>
        <Text variant="body" tone="inverse">
          {message}
        </Text>
      </View>
      {action !== undefined ? (
        <SnackbarAction label={action.label} onPress={action.onPress} />
      ) : null}
    </View>
  );
}

function SnackbarAction({ label, onPress }: NoticeAction) {
  const press = pressFeedback({ on: "accent", shape: "round" });
  return (
    <Pressable
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, press.style(pressed)]}
    >
      <Text variant="button" tone="inverse">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  snackbar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.controlHeight,
    backgroundColor: color.surface.inverse,
    borderRadius: radius.xs,
    paddingStart: spacing.lg,
    paddingEnd: spacing.lg,
    gap: spacing.sm,
    ...shadow.floating,
  },
  snackbarWithAction: { paddingEnd: spacing.sm },
  message: { flex: 1, paddingVertical: spacing.md },
  action: {
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
});
