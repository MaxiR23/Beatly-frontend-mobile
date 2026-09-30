// INFO: content with a handle at its bottom and a full-screen sheet pulled up from it: a drag up on the handle or its press opens (onDragStart tells the caller a drag began, onClosed that a close animation ended), a drag down on the sheet's header (or its body at its top) closes; the content darkens toward overlay.backdrop and drops to motion.behindSheetScale with the sheet's position; the handle nudges once when asked; under reduce motion the sheet and the dim fade and nothing moves or scales. The caller passes the labels translated.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout } from "../tokens/spacing.ts";
import { GradientFill } from "./GradientFill.tsx";
import { VerticalDrag } from "./VerticalDrag.tsx";

interface PullUpSheetProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDragStart?: (() => void) | undefined;
  onClosed?: (() => void) | undefined;
  reduceMotion: boolean;
  nudge: boolean;
  handleLabel: string;
  topInset: number;
  bottomInset: number;
  washColor: string | null;
  header: ReactNode;
  body: ReactNode;
  bodyAtTop: boolean;
  children: ReactNode;
  testID?: string;
}

export function PullUpSheet({
  open,
  onOpen,
  onClose,
  onDragStart,
  onClosed,
  reduceMotion,
  nudge,
  handleLabel,
  topInset,
  bottomInset,
  washColor,
  header,
  body,
  bodyAtTop,
  children,
  testID = "pull-up-sheet",
}: PullUpSheetProps) {
  const { height } = useWindowDimensions();
  const [position] = useState(() => new Animated.Value(open ? 0 : height));
  const [fade] = useState(() => new Animated.Value(open ? 1 : 0));
  const [lift] = useState(() => new Animated.Value(0));

  const closed = useRef(onClosed);
  useEffect(() => {
    closed.current = onClosed;
  });
  const lastOpen = useRef(open);
  useEffect(() => {
    if (lastOpen.current === open) return;
    lastOpen.current = open;
    const done = ({ finished }: { finished: boolean }) => {
      if (finished && !open) closed.current?.();
    };
    // The value the current motion mode does not draw is parked at its resting state, so a live reduce-motion change finds both consistent with open.
    if (reduceMotion) {
      position.setValue(open ? 0 : height);
      Animated.timing(fade, {
        toValue: open ? 1 : 0,
        duration: motion.duration.base,
        useNativeDriver: true,
      }).start(done);
      return;
    }
    fade.setValue(open ? 1 : 0);
    Animated.spring(position, {
      toValue: open ? 0 : height,
      damping: motion.spring.damping,
      stiffness: motion.spring.stiffness,
      useNativeDriver: true,
    }).start(done);
  }, [open, reduceMotion, height, position, fade]);

  const nudged = useRef(false);
  useEffect(() => {
    if (!nudge || nudged.current || reduceMotion) return;
    nudged.current = true;
    Animated.sequence([
      Animated.timing(lift, {
        toValue: -motion.handleNudge,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
      Animated.spring(lift, {
        toValue: 0,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        useNativeDriver: true,
      }),
    ]).start();
  }, [nudge, reduceMotion, lift]);

  const scale = reduceMotion
    ? 1
    : position.interpolate({
        inputRange: [0, height],
        outputRange: [motion.behindSheetScale, 1],
        extrapolate: "clamp",
      });
  const dim = reduceMotion
    ? fade
    : position.interpolate({ inputRange: [0, height], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View style={styles.fill}>
      <Animated.View
        style={[styles.behind, { transform: [{ scale }] }]}
        accessibilityElementsHidden={open}
        importantForAccessibility={open ? "no-hide-descendants" : "auto"}
        testID={`${testID}-behind`}
      >
        <View style={styles.fill}>{children}</View>
        <VerticalDrag
          direction="up"
          position={position}
          rest={height}
          enabled={!open}
          reduceMotion={reduceMotion}
          onCommit={onOpen}
          onDragStart={onDragStart}
          style={{ paddingBottom: bottomInset }}
          testID={`${testID}-handle-drag`}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={handleLabel}
            onPress={onOpen}
            style={styles.handleHit}
            testID={`${testID}-handle`}
          >
            <Animated.View style={[styles.handle, { transform: [{ translateY: lift }] }]} />
          </Pressable>
        </VerticalDrag>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]}
        testID={`${testID}-dim`}
      />
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        style={[
          StyleSheet.absoluteFill,
          styles.panel,
          reduceMotion ? { opacity: fade } : { transform: [{ translateY: position }] },
        ]}
        testID={`${testID}-panel`}
      >
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          {washColor !== null ? (
            <GradientFill direction="vertical" colors={[washColor, color.surface.base]} />
          ) : null}
        </View>
        <View style={{ paddingTop: topInset }}>
          <VerticalDrag
            direction="down"
            position={position}
            rest={0}
            enabled={open}
            reduceMotion={reduceMotion}
            onCommit={onClose}
            testID={`${testID}-header-drag`}
          >
            {header}
          </VerticalDrag>
        </View>
        <VerticalDrag
          direction="down"
          position={position}
          rest={0}
          enabled={open && bodyAtTop}
          reduceMotion={reduceMotion}
          onCommit={onClose}
          style={[styles.fill, { paddingBottom: bottomInset }]}
          testID={`${testID}-body-drag`}
        >
          {body}
        </VerticalDrag>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  behind: { flex: 1, backgroundColor: color.surface.base },
  handleHit: {
    height: layout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: layout.handleWidth,
    height: layout.handleHeight,
    borderRadius: radius.full,
    backgroundColor: color.overlay.muted,
  },
  dim: { backgroundColor: color.overlay.backdrop },
  panel: {
    ...shadow.floating,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: color.surface.base,
  },
  clip: {
    overflow: "hidden",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
