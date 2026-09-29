// INFO: the login screen: email and password, the mapped failure message, and a link to sign up.
import { layout, spacing, color } from "@beatly/ui";
import { Button, Input, Text } from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useSignIn } from "../../queries/useAuth.ts";

export function LoginScreen() {
  const t = useT("login");
  const tc = useT("common");
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const failure = signIn.data?.kind === "failure" ? signIn.data : null;
  let message: string | null = null;
  if (failure !== null) {
    switch (failure.reason) {
      case "invalid_credentials":
        message = t("errors.invalidCredentials");
        break;
      case "email_not_confirmed":
        message = t("errors.emailNotConfirmed");
        break;
      case "rate_limited":
        message = t("errors.rateLimited");
        break;
      default:
        message = tc("error.generic");
    }
  }

  return (
    <SafeAreaView testID="login" style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text variant="title">{t("title")}</Text>
        <Input
          label={t("email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Input
          label={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
        />
        {message !== null ? (
          <Text variant="meta" tone="error">
            {message}
          </Text>
        ) : null}
        <Button
          label={t("submit")}
          loading={signIn.isPending}
          disabled={email.trim() === "" || password === ""}
          onPress={() => {
            signIn.mutate({ email: email.trim(), password });
          }}
        />
        <Text tone="secondary">{t("noAccount")}</Text>
        <Button
          variant="ghost"
          label={t("goToSignUp")}
          onPress={() => {
            router.push("/sign-up");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  content: {
    padding: layout.gutter,
    gap: spacing.md,
    flexGrow: 1,
    justifyContent: "center",
  },
});
