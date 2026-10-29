// INFO: a bottom modal sheet closed by its backdrop or the system back action, lifted above the keyboard on iOS; it shrinks to the room left so a long list scrolls inside it, and a topInset keeps it clear of the status bar. On iOS it is a GlassSurface attached to the bottom and side edges like the system sheet: radius.xl top corners, its background reaching the bottom edge and its content above the bottom inset. On Android it is the Material 3 modal bottom sheet (ADR 027): attached to the bottom and side edges, radius.xl top corners, a drag handle in a top zone (the only drag zone) that closes the sheet past the VerticalDrag thresholds and springs back short of them, content above the bottom inset, and a drag that does not move under reduce motion. On both platforms it opens and closes like the system sheet: the backdrop fades in place while only the sheet slides, up from the bottom edge over motion.duration.slow with motion.easing.enter and down over motion.duration.base with motion.easing.exit, on the native driver; the Modal stays up until the close ends and then calls onClosed, and the sheet and its backdrop take no touches while it closes, nor the system back; under reduce motion both appear and disappear at once, also when it turns on half way. The caller passes the close label translated.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { VerticalDrag } from "./VerticalDrag.tsx";
import { isAndroidVariant } from "./platform.ts";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  // Called once the close animation has ended and the Modal is gone (at once under reduce motion); a caller that mounts the sheet on open unmounts it here, never before.
  onClosed?: (() => void) | undefined;
  closeLabel: string;
  // The window's bottom safe-area inset: the Sheet is a Modal over the whole window, so never a tab's inset, which includes the tab bar.
  bottomInset: number;
  // The top safe-area inset the sheet stays below when it grows tall; 0 leaves the padding as is.
  topInset?: number;
  // No slide and no fade on either platform, and on Android a drag that does not move.
  reduceMotion: boolean;
  children: ReactNode;
}

export function Sheet({
  visible,
  onClose,
  onClosed,
  closeLabel,
  bottomInset,
  topInset = 0,
  reduceMotion,
  children,
}: SheetProps) {
  const android = isAndroidVariant();
  const { height } = useWindowDimensions();
  const [backdrop] = useState(() => new Animated.Value(0));
  const [slide] = useState(() => new Animated.Value(height));
  // Keeps the Modal up while the close animation runs.
  const [presented, setPresented] = useState(visible);
  // An Android drag that committed takes no more drags until the sheet opens again.
  const [dragClosed, setDragClosed] = useState(false);
  const closed = useRef(onClosed);
  useEffect(() => {
    closed.current = onClosed;
  });
  const lastVisible = useRef(false);
  const exiting = useRef(false);
  const finish = () => {
    exiting.current = false;
    setPresented(false);
    closed.current?.();
  };
  useEffect(() => {
    if (lastVisible.current === visible) return;
    lastVisible.current = visible;
    if (visible) {
      exiting.current = false;
      setPresented(true);
      setDragClosed(false);
      if (reduceMotion) {
        backdrop.setValue(1);
        slide.setValue(0);
        return;
      }
      const enter = {
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.easing.enter),
        useNativeDriver: true,
      };
      Animated.timing(backdrop, { toValue: 1, ...enter }).start();
      Animated.timing(slide, { toValue: 0, ...enter }).start();
      return;
    }
    exiting.current = true;
    if (reduceMotion) {
      backdrop.setValue(0);
      slide.setValue(height);
      finish();
      return;
    }
    const exit = {
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing.exit),
      useNativeDriver: true,
    };
    Animated.timing(backdrop, { toValue: 0, ...exit }).start();
    Animated.timing(slide, { toValue: height, ...exit }).start(({ finished }) => {
      if (finished) finish();
    });
  }, [visible, reduceMotion, height, backdrop, slide]);
  // A live change to reduce motion (its read answers after the first render) parks an open or a close under way at its end.
  useEffect(() => {
    if (!reduceMotion) return;
    if (lastVisible.current) {
      backdrop.setValue(1);
      slide.setValue(0);
    } else if (exiting.current) {
      backdrop.setValue(0);
      slide.setValue(height);
      finish();
    }
  }, [reduceMotion, height, backdrop, slide]);
  useEffect(
    () => () => {
      backdrop.stopAnimation();
      slide.stopAnimation();
    },
    [backdrop, slide],
  );
  return (
    <Modal
      transparent
      animationType="none"
      visible={visible || presented}
      onRequestClose={visible ? onClose : undefined}
      testID="sheet-modal"
    >
      <KeyboardAvoidingView
        testID="sheet-container"
        style={styles.container}
        behavior={android ? undefined : "padding"}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Animated.View testID="sheet-backdrop" style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {android ? (
          <AndroidSheet
            position={slide}
            enabled={visible && !dragClosed}
            onCommit={() => {
              setDragClosed(true);
              onClose();
            }}
            reduceMotion={reduceMotion}
            topInset={topInset}
            bottomInset={bottomInset}
          >
            {children}
          </AndroidSheet>
        ) : (
          <Animated.View
            testID="sheet-frame"
            style={[
              styles.sheet,
              { paddingTop: topInset + layout.gutter, transform: [{ translateY: slide }] },
            ]}
          >
            <GlassSurface variant="sheet" testID="sheet-surface">
              <View
                testID="sheet-content"
                style={[styles.sheetContent, { paddingBottom: bottomInset }]}
              >
                {children}
              </View>
            </GlassSurface>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AndroidSheetProps {
  position: Animated.Value;
  enabled: boolean;
  onCommit: () => void;
  reduceMotion: boolean;
  topInset: number;
  bottomInset: number;
  children: ReactNode;
}

function AndroidSheet({
  position,
  enabled,
  onCommit,
  reduceMotion,
  topInset,
  bottomInset,
  children,
}: AndroidSheetProps) {
  return (
    <View style={[styles.androidFrame, { paddingTop: topInset + layout.gutter }]}>
      <Animated.View
        style={[
          styles.androidSurface,
          { paddingBottom: bottomInset + spacing.xl, transform: [{ translateY: position }] },
        ]}
        testID="sheet-surface"
      >
        <VerticalDrag
          direction="down"
          position={position}
          rest={0}
          enabled={enabled}
          reduceMotion={reduceMotion}
          onCommit={onCommit}
          style={styles.handleZone}
          testID="sheet-handle-zone"
        >
          <View style={styles.handle} testID="sheet-handle" />
        </VerticalDrag>
        <View style={styles.androidContent} testID="sheet-content">
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.overlay.backdrop,
  },
  sheet: {
    flexShrink: 1,
  },
  sheetContent: {
    flexShrink: 1,
    gap: spacing.lg,
  },
  androidFrame: { flexShrink: 1 },
  androidSurface: {
    flexShrink: 1,
    backgroundColor: color.surface.raised,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handleZone: {
    height: layout.modalHandleZoneAndroid,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: layout.modalHandleWidthAndroid,
    height: layout.handleHeight,
    borderRadius: radius.full,
    backgroundColor: color.overlay.handleAndroid,
  },
  androidContent: {
    flexShrink: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
});
