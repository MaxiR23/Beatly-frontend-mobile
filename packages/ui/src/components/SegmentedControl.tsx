// INFO: a segmented control: equal options, one selected; the caller passes the labels translated. iOS draws them in a pill; on Android they are the Material 3 primary tabs (ADR 027): full width, a divider under the row and an indicator under the selected label that slides to it, without sliding under reduce motion.
import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";

interface SegmentedControlProps<K extends string> {
  options: readonly { key: K; label: string }[];
  selected: K;
  onChange: (key: K) => void;
  reduceMotion: boolean;
  testID?: string;
}

export function SegmentedControl<K extends string>({
  options,
  selected,
  onChange,
  reduceMotion,
  testID,
}: SegmentedControlProps<K>) {
  if (isAndroidVariant()) {
    return (
      <AndroidTabs
        options={options}
        selected={selected}
        onChange={onChange}
        reduceMotion={reduceMotion}
        {...(testID !== undefined ? { testID } : {})}
      />
    );
  }
  const press = pressFeedback();
  return (
    <View accessibilityRole="tablist" style={styles.container} testID={testID}>
      {options.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            android_ripple={press.android_ripple}
            key={option.key}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (!isSelected) onChange(option.key);
            }}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.selected,
              press.style(pressed),
            ]}
          >
            <Text variant="button" tone={isSelected ? "primary" : "secondary"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AndroidTabs<K extends string>({
  options,
  selected,
  onChange,
  reduceMotion,
  testID,
}: SegmentedControlProps<K>) {
  const press = pressFeedback();
  const [tabs, setTabs] = useState<Partial<Record<K, { x: number; width: number }>>>({});
  const [labels, setLabels] = useState<Partial<Record<K, number>>>({});
  const tab = tabs[selected];
  const label = labels[selected];
  const target =
    tab !== undefined && label !== undefined
      ? { left: tab.x + (tab.width - label) / 2, width: label }
      : null;
  const left = target?.left ?? null;
  const [offset] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  useLayoutEffect(() => {
    if (left === null) return;
    if (!placed.current || reduceMotion) {
      offset.setValue(left);
      placed.current = true;
      return;
    }
    const slide = Animated.timing(offset, {
      toValue: left,
      duration: motion.duration.base,
      useNativeDriver: true,
    });
    slide.start();
    return () => {
      slide.stop();
    };
  }, [offset, left, reduceMotion]);
  return (
    <View accessibilityRole="tablist" style={styles.androidRow} testID={testID}>
      {options.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            android_ripple={press.android_ripple}
            key={option.key}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (!isSelected) onChange(option.key);
            }}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setTabs((prev) => ({ ...prev, [option.key]: { x, width } }));
            }}
            style={({ pressed }) => [styles.androidTab, press.style(pressed)]}
          >
            <View
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setLabels((prev) => ({ ...prev, [option.key]: width }));
              }}
              {...(testID !== undefined ? { testID: `${testID}-label-${option.key}` } : {})}
            >
              <Text variant="button" tone={isSelected ? "primary" : "secondary"}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {target !== null ? (
        <Animated.View
          pointerEvents="none"
          {...(testID !== undefined ? { testID: `${testID}-indicator` } : {})}
          style={[styles.indicator, { width: target.width, transform: [{ translateX: offset }] }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: color.overlay.subtle,
  },
  option: {
    flex: 1,
    height: layout.chipHeight,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: color.overlay.muted },
  androidRow: {
    flexDirection: "row",
    borderBottomWidth: border.width,
    borderBottomColor: color.surface.border,
  },
  androidTab: {
    flex: 1,
    height: layout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: layout.tabIndicatorHeightAndroid,
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    backgroundColor: color.accent.primary,
  },
});
