// INFO: the live password rule list of the sign up screen: one row per rule, met or unmet.
import { spacing } from "@beatly/ui";
import { Icon, Text } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { PASSWORD_MIN_LENGTH, passwordRules } from "./signUpRules.ts";

export function PasswordRules({ password }: { readonly password: string }) {
  const t = useT("signUp");
  return (
    <View style={styles.column}>
      {passwordRules(password).map((rule) => {
        const tone = rule.met ? "success" : "tertiary";
        return (
          <View key={rule.id} accessibilityState={{ checked: rule.met }} style={styles.row}>
            <Icon name="check" size="sm" tone={tone} />
            <Text variant="meta" tone={tone}>
              {t("rules.minLength", { min: PASSWORD_MIN_LENGTH })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.xs },
  row: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
});
