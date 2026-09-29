// INFO: Phase 1 showcase of every ui component and state; the login screen
// replaces it.
import { border, color, layout, radius, spacing } from "@beatly/ui";
import { Button, EmptyState, ErrorState, Icon, Input, LoadingState, Text } from "@beatly/ui/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";

const textRoles = [
  "display",
  "title",
  "section",
  "subtitle",
  "rowTitle",
  "body",
  "meta",
  "label",
  "button",
] as const;

const buttonVariants = ["primary", "secondary", "ghost"] as const;
const iconSizes = ["sm", "md", "lg", "xl", "hero"] as const;

export function ShowcaseScreen() {
  const t = useT("showcase");
  const tc = useT("common");
  const [email, setEmail] = useState("");

  return (
    <SafeAreaView testID="showcase" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">{t("title")}</Text>

        <View style={styles.section}>
          <Text variant="section">{t("sections.text")}</Text>
          {textRoles.map((role) => (
            <Text key={role} variant={role}>
              {t(`text.${role}`)}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text variant="section">{t("sections.buttons")}</Text>
          {buttonVariants.map((variant) => (
            <Button
              key={variant}
              variant={variant}
              label={t(`buttons.${variant}`)}
              onPress={() => undefined}
            />
          ))}
          {buttonVariants.map((variant) => (
            <Button
              key={`loading-${variant}`}
              variant={variant}
              loading
              label={t("buttons.loading")}
              onPress={() => undefined}
            />
          ))}
          {buttonVariants.map((variant) => (
            <Button
              key={`disabled-${variant}`}
              variant={variant}
              disabled
              label={t("buttons.disabled")}
              onPress={() => undefined}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text variant="section">{t("sections.input")}</Text>
          <Input
            label={t("input.label")}
            placeholder={t("input.placeholder")}
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label={t("input.label")}
            placeholder={t("input.placeholder")}
            value={email}
            onChangeText={setEmail}
            error={t("input.error")}
          />
        </View>

        <View style={styles.section}>
          <Text variant="section">{t("sections.icons")}</Text>
          <View style={styles.iconRow}>
            {iconSizes.map((size) => (
              <Icon key={size} name="music" size={size} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="section">{t("sections.states")}</Text>
          <View style={styles.frame}>
            <LoadingState label={tc("loading")} />
          </View>
          <View style={styles.frame}>
            <EmptyState
              icon="inbox"
              message={t("empty.message")}
              action={{ label: t("empty.action"), onPress: () => undefined }}
            />
          </View>
          <View style={styles.frame}>
            <EmptyState icon="inbox" message={t("empty.message")} />
          </View>
          <View style={styles.frame}>
            <ErrorState
              message={tc("error.generic")}
              retryLabel={tc("retry")}
              onRetry={() => undefined}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  content: { padding: layout.gutter, gap: spacing.xl },
  section: { gap: spacing.md },
  iconRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  frame: {
    borderWidth: border.width,
    borderColor: color.surface.border,
    borderRadius: radius.md,
  },
});
