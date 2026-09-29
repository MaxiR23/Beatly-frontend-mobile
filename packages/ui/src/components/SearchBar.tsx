// INFO: a pill search field on the card surface, control height, with a leading search icon and a clear button while it has text.
import { StyleSheet, TextInput, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { maxFontScale, typography } from "../tokens/typography.ts";
import { Icon } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  clearLabel: string;
  onSubmit: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  clearLabel,
  onSubmit,
}: SearchBarProps) {
  return (
    <View style={styles.field}>
      <Icon name="search" size="md" tone="tertiary" />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        maxFontSizeMultiplier={maxFontScale}
        placeholderTextColor={color.text.tertiary}
        selectionColor={color.accent.primary}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        style={styles.input}
      />
      {value !== "" ? (
        <IconButton
          icon="x"
          accessibilityLabel={clearLabel}
          onPress={() => {
            onChangeText("");
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.controlHeight,
    backgroundColor: color.surface.card,
    borderWidth: border.width,
    borderColor: color.surface.border,
    borderRadius: radius.full,
    paddingLeft: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: color.text.primary,
  },
});
