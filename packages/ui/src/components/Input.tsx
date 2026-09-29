// INFO: labeled text input on the card surface, with an optional error
// message that turns the border to the error color.
import { StyleSheet, TextInput, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { spacing } from "../tokens/spacing.ts";
import { maxFontScale, typography } from "../tokens/typography.ts";
import { Text } from "./Text.tsx";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
  autoComplete?: "email" | "password" | "new-password" | "name";
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: InputProps) {
  return (
    <View style={styles.column}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        maxFontSizeMultiplier={maxFontScale}
        placeholderTextColor={color.text.tertiary}
        selectionColor={color.accent.primary}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        style={[styles.input, { borderColor: error ? color.status.error : color.surface.border }]}
      />
      {error ? (
        <Text variant="meta" tone="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: color.text.primary,
    backgroundColor: color.surface.card,
    borderWidth: border.width,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
