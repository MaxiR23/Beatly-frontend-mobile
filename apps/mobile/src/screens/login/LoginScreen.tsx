// INFO: the login screen: email and password, the mapped failure message, and a link to sign up.
import { Button, Input, Text } from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useT } from "../../adapters/i18n.ts";
import { useSignIn } from "../../queries/useAuth.ts";
import { AuthLayout } from "../auth/AuthLayout.tsx";

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
    <AuthLayout
      testID="login"
      subtitle={t("subtitle")}
      title={t("title")}
      description={t("description")}
      switchText={t("noAccount")}
      switchLabel={t("goToSignUp")}
      onSwitch={() => {
        router.push("/sign-up");
      }}
    >
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
        reveal={{ show: tc("password.show"), hide: tc("password.hide") }}
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
        shape="field"
        loading={signIn.isPending}
        disabled={email.trim() === "" || password === ""}
        onPress={() => {
          signIn.mutate({ email: email.trim(), password });
        }}
      />
    </AuthLayout>
  );
}
