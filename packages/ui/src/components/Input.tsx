// INFO: labeled text input on the card surface, 48 high, with an optional
// error, an optional multiline mode at text area height, and an optional eye
// button that shows and hides a secure entry, and an optional fixed prefix
// drawn before the entry, outside its value. On Android it is the Material 3
// outlined text field (ADR 027): an outline with extra-small corners, the label
// inside at rest rising onto the outline on focus or with text (without an
// animation under reduce motion), a thicker accent outline on focus, the error
// color on error, the error under the field announced. The label's notch
// assumes the field sits on color.surface.raised. iOS is unchanged.
import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { maxFontScale, typography } from "../tokens/typography.ts";
import { Icon } from "./Icon.tsx";
import { isAndroidVariant } from "./platform.ts";
import { Text } from "./Text.tsx";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  reveal?: { show: string; hide: string };
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
  autoComplete?: "email" | "password" | "new-password" | "name";
  prefix?: string;
  // On Android: the label moves without an animation; iOS ignores it.
  reduceMotion: boolean;
}

// Every prop of the Input, passed explicitly (undefined when absent), plus the shared reveal state.
type AndroidInputProps = { [K in keyof Required<InputProps>]: InputProps[K] | undefined } & {
  revealed: boolean;
  onToggleReveal: () => void;
  secure: boolean | undefined;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  multiline,
  reveal,
  keyboardType,
  autoCapitalize,
  autoComplete,
  prefix,
  reduceMotion,
}: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const secure = reveal === undefined ? secureTextEntry : !revealed;

  if (isAndroidVariant()) {
    return (
      <AndroidInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={error}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        reveal={reveal}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        prefix={prefix}
        reduceMotion={reduceMotion}
        secure={secure}
        revealed={revealed}
        onToggleReveal={() => {
          setRevealed(!revealed);
        }}
      />
    );
  }

  return (
    <View style={styles.column}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View
        style={[
          styles.field,
          multiline ? styles.fieldMultiline : undefined,
          { borderColor: error ? color.status.error : color.surface.border },
        ]}
      >
        {prefix !== undefined ? (
          <View accessible={false} style={styles.prefix}>
            <Text variant="body" tone="secondary">
              {prefix}
            </Text>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          maxFontSizeMultiplier={maxFontScale}
          placeholderTextColor={color.text.tertiary}
          selectionColor={color.accent.primary}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secure}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          style={[
            styles.input,
            multiline ? styles.inputMultiline : undefined,
            prefix !== undefined ? styles.inputAfterPrefix : undefined,
          ]}
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

const raisedScale = typography.meta.fontSize / typography.body.fontSize;

function AndroidInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  reveal,
  keyboardType,
  autoCapitalize,
  autoComplete,
  prefix,
  reduceMotion,
  secure,
  revealed,
  onToggleReveal,
}: AndroidInputProps) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value !== "";
  const [progress] = useState(() => new Animated.Value(raised ? 1 : 0));
  const placed = useRef(false);

  useLayoutEffect(() => {
    if (!placed.current || reduceMotion) {
      progress.setValue(raised ? 1 : 0);
      placed.current = true;
      return;
    }
    const move = Animated.timing(progress, {
      toValue: raised ? 1 : 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    });
    move.start();
    return () => {
      move.stop();
    };
  }, [progress, raised, reduceMotion]);

  const restTop = multiline ? spacing.md : (layout.controlHeight - typography.body.lineHeight) / 2;
  const raisedShift = -(restTop + typography.body.lineHeight / 2);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, raisedShift] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, raisedScale] });
  const showPrefix = prefix !== undefined && raised;

  return (
    <View style={styles.androidColumn}>
      <View style={[styles.androidField, multiline ? styles.fieldMultiline : undefined]}>
        <View
          pointerEvents="none"
          testID="input-outline"
          style={[
            styles.androidOutline,
            {
              borderWidth: focused ? border.widthFocused : border.width,
              borderColor: error
                ? color.status.error
                : focused
                  ? color.accent.primary
                  : color.surface.border,
            },
          ]}
        />
        {showPrefix ? (
          <View accessible={false} style={styles.prefix}>
            <Text variant="body" tone="secondary">
              {prefix}
            </Text>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          maxFontSizeMultiplier={maxFontScale}
          placeholderTextColor={color.text.tertiary}
          selectionColor={color.accent.primary}
          value={value}
          onChangeText={onChangeText}
          placeholder={raised ? placeholder : undefined}
          secureTextEntry={secure}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
          style={[
            styles.input,
            multiline ? styles.inputMultiline : undefined,
            showPrefix ? styles.inputAfterPrefix : undefined,
          ]}
        />
        {reveal ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? reveal.hide : reveal.show}
            hitSlop={{ top: border.width, bottom: border.width }}
            onPress={onToggleReveal}
            style={styles.reveal}
          >
            <Icon name={revealed ? "eyeOff" : "eye"} size="md" tone="tertiary" />
          </Pressable>
        ) : null}
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          testID="input-label"
          style={[styles.androidLabel, { top: restTop, transform: [{ translateY }, { scale }] }]}
        >
          <Text
            variant="body"
            tone={error ? "error" : focused ? "primary" : "secondary"}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
      {error ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.androidSupporting}
          testID="input-error"
        >
          <Text variant="meta" tone="error">
            {error}
          </Text>
        </View>
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
  fieldMultiline: { alignItems: "stretch", minHeight: layout.textAreaHeight },
  input: {
    ...typography.body,
    flex: 1,
    color: color.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  prefix: { paddingLeft: spacing.lg },
  inputAfterPrefix: { paddingLeft: spacing.xs },
  inputMultiline: { textAlignVertical: "top" },
  reveal: {
    alignSelf: "stretch",
    width: layout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  androidColumn: { gap: spacing.xs },
  androidField: { flexDirection: "row", alignItems: "center", minHeight: layout.controlHeight },
  androidOutline: { ...StyleSheet.absoluteFill, borderRadius: radius.xs },
  androidLabel: {
    position: "absolute",
    left: spacing.lg - spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: color.surface.raised,
    transformOrigin: "left center",
  },
  androidSupporting: { paddingHorizontal: spacing.lg },
});
