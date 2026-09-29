// INFO: the sign up screen: name, email and password with live rules, the mapped failure message, and the "check your email" success state.
import { color, layout, spacing } from "@beatly/ui";
import { Button, EmptyState, Input, Text } from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useSignUp } from "../../queries/useAuth.ts";
import { PasswordRules } from "./PasswordRules.tsx";
import { canSubmitSignUp, NAME_MAX_LENGTH } from "./signUpRules.ts";

export function SignUpScreen() {
  const t = useT("signUp");
  const tc = useT("common");
  const router = useRouter();
  const signUp = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const goToLogin = () => {
    // Login pushes this screen, so going back keeps a single login in the stack; a deep link has nothing to go back to.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  const failure = signUp.data?.kind === "failure" ? signUp.data : null;
  let message: string | null = null;
  if (failure !== null) {
    switch (failure.reason) {
      case "weak_password":
        message = t("errors.weakPassword");
        break;
      case "user_already_exists":
        message = t("errors.userAlreadyExists");
        break;
      case "invalid_email":
        message = t("errors.invalidEmail");
        break;
      case "rate_limited":
        message = t("errors.rateLimited");
        break;
      default:
        message = tc("error.generic");
    }
  }

  if (signUp.data?.kind === "confirmation_sent") {
    return (
      <SafeAreaView testID="signUp" style={styles.screen}>
        <EmptyState
          icon="mail"
          message={t("sent.message", { email: email.trim() })}
          action={{ label: t("sent.backToLogin"), onPress: goToLogin }}
        />
      </SafeAreaView>
    );
  }

  const input = { name, email, password };
  return (
    <SafeAreaView testID="signUp" style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text variant="title">{t("title")}</Text>
        <Input
          label={t("name")}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          {...(name.trim().length > NAME_MAX_LENGTH
            ? { error: t("nameTooLong", { max: NAME_MAX_LENGTH }) }
            : {})}
        />
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
          autoComplete="new-password"
        />
        <PasswordRules password={password} />
        {message !== null ? (
          <Text variant="meta" tone="error">
            {message}
          </Text>
        ) : null}
        <Button
          label={t("submit")}
          loading={signUp.isPending}
          disabled={!canSubmitSignUp(input)}
          onPress={() => {
            signUp.mutate({ name: name.trim(), email: email.trim(), password });
          }}
        />
        <Text tone="secondary">{t("haveAccount")}</Text>
        <Button variant="ghost" label={t("goToLogin")} onPress={goToLogin} />
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
