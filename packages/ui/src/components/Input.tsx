// INFO: labeled text input on the card surface, 48 high, with an optional
// error and an optional eye button that shows and hides a secure entry.
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { maxFontScale, typography } from "../tokens/typography.ts";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  reveal?: { show: string; hide: string };
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
  reveal,
  keyboardType,
  autoCapitalize,
  autoComplete,
}: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const secure = reveal === undefined ? secureTextEntry : !revealed;

  return (
    <View style={styles.column}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View
        style={[styles.field, { borderColor: error ? color.status.error : color.surface.border }]}
      >
        <TextInput
          accessibilityLabel={label}
          maxFontSizeMultiplier={maxFontScale}
          placeholderTextColor={color.text.tertiary}
          selectionColor={color.accent.primary}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          style={styles.input}
        />
        {reveal ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? reveal.hide : reveal.show}
            hitSlop={{ top: border.width, bottom: border.width }}
            onPress={() => {
              setRevealed(!revealed);
            }}
            style={styles.reveal}
          >
            <Icon name={revealed ? "eyeOff" : "eye"} size="md" tone="tertiary" />
          </Pressable>
        ) : null}
      </View>
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
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.controlHeight,
    backgroundColor: color.surface.card,
    borderWidth: border.width,
    borderRadius: radius.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: color.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  reveal: {
    alignSelf: "stretch",
    width: layout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
  },
});
