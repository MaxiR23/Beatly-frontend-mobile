// INFO: the layout the login and sign up screens share: brand block, the form card with its switch line, and the footer.
import { color, icon, layout, radius, spacing } from "@beatly/ui";
import { Card, Link, Text } from "@beatly/ui/native";
import type { ReactNode } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import brandIcon from "../../../assets/brand-icon.png";
import { useT } from "../../adapters/i18n.ts";

interface AuthLayoutProps {
  readonly testID: string;
  readonly subtitle: string;
  readonly title: string;
  readonly description: string;
  readonly switchText: string;
  readonly switchLabel: string;
  readonly onSwitch: () => void;
  readonly children: ReactNode;
}

export function AuthLayout({
  testID,
  subtitle,
  title,
  description,
  switchText,
  switchLabel,
  onSwitch,
  children,
}: AuthLayoutProps) {
  const tc = useT("common");
  return (
    <SafeAreaView testID={testID} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Image
              source={brandIcon}
              style={styles.markImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text variant="brand" align="center">
            {tc("brand")}
          </Text>
          <Text tone="secondary" align="center">
            {subtitle}
          </Text>
        </View>
        <Card>
          <View style={styles.header}>
            <Text variant="title">{title}</Text>
            <Text tone="secondary">{description}</Text>
          </View>
          {children}
          <Text tone="secondary" align="center">
            {switchText} <Link label={switchLabel} onPress={onSwitch} />
          </Text>
        </Card>
        <Text variant="meta" tone="tertiary" align="center">
          {tc("footer")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  content: {
    padding: layout.gutter,
    gap: spacing.xl,
    flexGrow: 1,
    justifyContent: "center",
  },
  brand: { alignItems: "center", gap: spacing.sm },
  mark: {
    width: icon.size.hero,
    height: icon.size.hero,
    borderRadius: radius.lg,
    backgroundColor: color.accent.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  markImage: { width: icon.size.hero, height: icon.size.hero },
  header: { gap: spacing.xs },
});
