// INFO: a bottom modal sheet on a GlassSurface, closed by its backdrop or
// the system back action, lifted above the keyboard on iOS; it shrinks to the room left so a long list scrolls inside it, and a topInset keeps it clear of the status bar. The caller passes the close label translated.
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { layout } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  bottomInset: number;
  // The top safe-area inset the sheet stays below when it grows tall; 0 leaves the padding as is.
  topInset?: number;
  children: ReactNode;
}

export function Sheet({
  visible,
  onClose,
  closeLabel,
  bottomInset,
  topInset = 0,
  children,
}: SheetProps) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingTop: topInset + layout.gutter, paddingBottom: bottomInset + layout.gutter },
          ]}
        >
          <GlassSurface variant="sheet">{children}</GlassSurface>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
});
