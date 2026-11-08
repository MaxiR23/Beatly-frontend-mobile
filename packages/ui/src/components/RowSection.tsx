// INFO: a section of rows: its title (an optional action at its end) with spacing.md under it, then the rows the caller passes with no space between them; SectionTitle is the title alone, for rows drawn by a list (the detail base).
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

interface SectionTitleProps {
  title: string;
  action?: ReactNode;
  testID?: string;
}

export function SectionTitle({ title, action, testID }: SectionTitleProps) {
  return (
    <View style={styles.title} testID={testID}>
      <Text variant="section">{title}</Text>
      {action}
    </View>
  );
}

interface RowSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  testID?: string;
}

export function RowSection({ title, action, children, testID }: RowSectionProps) {
  return (
    <View testID={testID}>
      <SectionTitle title={title} action={action} />
      {/* No gap, padding or separator: each row carries its own vertical padding. */}
      <View testID={testID !== undefined ? `${testID}-rows` : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.md,
  },
});
