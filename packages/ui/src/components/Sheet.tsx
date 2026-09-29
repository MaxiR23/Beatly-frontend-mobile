// INFO: a bottom modal sheet on a GlassSurface, closed by its backdrop or
// the system back action. The caller passes the close label translated.
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { layout } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  bottomInset: number;
  children: ReactNode;
}

export function Sheet({ visible, onClose, closeLabel, bottomInset, children }: SheetProps) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { paddingBottom: bottomInset + layout.gutter }]}>
          <GlassSurface variant="sheet">{children}</GlassSurface>
        </View>
      </View>
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
    padding: layout.gutter,
  },
});
