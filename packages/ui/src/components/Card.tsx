// INFO: raised bordered container that stacks its children; the auth form card.
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { spacing } from "../tokens/spacing.ts";

export function Card({ children }: { readonly children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    backgroundColor: color.surface.raised,
    borderWidth: border.width,
    borderColor: color.surface.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
