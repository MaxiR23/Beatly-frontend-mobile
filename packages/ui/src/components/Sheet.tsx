// INFO: a bottom modal sheet closed by its backdrop or the system back action, lifted above the keyboard on iOS; it shrinks to the room left so a long list scrolls inside it, and a topInset keeps it clear of the status bar. On iOS it is a floating GlassSurface. On Android it is the Material 3 modal bottom sheet (ADR 027): attached to the bottom and side edges, radius.xl top corners, a drag handle in a top zone (the only drag zone) that closes the sheet past the VerticalDrag thresholds and springs back short of them, content above the bottom inset, and no enter or exit animation under reduce motion. The caller passes the close label translated.
import { useState, type ReactNode } from "react";
import { Animated, KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { VerticalDrag } from "./VerticalDrag.tsx";
import { isAndroidVariant } from "./platform.ts";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  bottomInset: number;
  // The top safe-area inset the sheet stays below when it grows tall; 0 leaves the padding as is.
  topInset?: number;
  // On Android: no enter or exit animation and a drag that does not move; iOS ignores it (issue 122 keeps iOS as it is).
  reduceMotion: boolean;
  children: ReactNode;
}

export function Sheet({
  visible,
  onClose,
  closeLabel,
  bottomInset,
  topInset = 0,
  reduceMotion,
  children,
}: SheetProps) {
  const android = isAndroidVariant();
  return (
    <Modal
      transparent
      animationType={android && reduceMotion ? "none" : "slide"}
      visible={visible}
      onRequestClose={onClose}
      testID="sheet-modal"
    >
      <KeyboardAvoidingView style={styles.container} behavior={android ? undefined : "padding"}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={styles.backdrop}
        />
        {android ? (
          <AndroidSheet
            onClose={onClose}
            reduceMotion={reduceMotion}
            topInset={topInset}
            bottomInset={bottomInset}
          >
            {children}
          </AndroidSheet>
        ) : (
          <View
            style={[
              styles.sheet,
              { paddingTop: topInset + layout.gutter, paddingBottom: bottomInset + layout.gutter },
            ]}
          >
            <GlassSurface variant="sheet">{children}</GlassSurface>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AndroidSheetProps {
  onClose: () => void;
  reduceMotion: boolean;
  topInset: number;
  bottomInset: number;
  children: ReactNode;
}

// Mounted inside the Modal, so its offset and closed flag start fresh on each open.
function AndroidSheet({
  onClose,
  reduceMotion,
  topInset,
  bottomInset,
  children,
}: AndroidSheetProps) {
  const [offset] = useState(() => new Animated.Value(0));
  const [closed, setClosed] = useState(false);
  return (
    <View style={[styles.androidFrame, { paddingTop: topInset + layout.gutter }]}>
      <Animated.View
        style={[
          styles.androidSurface,
          { paddingBottom: bottomInset + spacing.xl, transform: [{ translateY: offset }] },
        ]}
        testID="sheet-surface"
      >
        <VerticalDrag
          direction="down"
          position={offset}
          rest={0}
          enabled={!closed}
          reduceMotion={reduceMotion}
          onCommit={() => {
            setClosed(true);
            onClose();
          }}
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
    padding: layout.gutter,
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
