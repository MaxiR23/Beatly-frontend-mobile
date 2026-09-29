// INFO: the email link callback: verifies the one-time token once, then redirects home, or draws the invalid link state.
import type { EmailLink } from "@beatly/core";
import { color } from "@beatly/ui";
import { ErrorState, LoadingState } from "@beatly/ui/native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useConfirmEmail } from "../../queries/useAuth.ts";

function parseLink(params: {
  token_hash?: string | string[] | undefined;
  type?: string | string[] | undefined;
}): EmailLink | null {
  const { token_hash: tokenHash, type } = params;
  if (typeof tokenHash !== "string" || tokenHash === "") return null;
  if (type !== "signup" && type !== "email") return null;
  return { tokenHash, type };
}

export function AuthCallbackScreen() {
  const t = useT("authCallback");
  const tc = useT("common");
  const router = useRouter();
  const params = useLocalSearchParams<{
    token_hash?: string | string[];
    type?: string | string[];
  }>();
  const link = parseLink(params);
  const confirm = useConfirmEmail();
  const started = useRef(false);
  const { mutate } = confirm;
  const tokenHash = link?.tokenHash;
  const type = link?.type;

  useEffect(() => {
    if (tokenHash === undefined || type === undefined || started.current) return;
    started.current = true;
    mutate({ tokenHash, type });
  }, [tokenHash, type, mutate]);

  const backToLogin = () => {
    router.replace("/login");
  };

  let body;
  if (link === null) {
    body = (
      <ErrorState message={t("invalidLink")} retryLabel={t("backToLogin")} onRetry={backToLogin} />
    );
  } else if (confirm.data?.kind === "success") {
    body = <Redirect href="/" />;
  } else if (confirm.data?.kind === "failure" && confirm.data.reason === "link_invalid") {
    body = (
      <ErrorState message={t("invalidLink")} retryLabel={t("backToLogin")} onRetry={backToLogin} />
    );
  } else if (confirm.data?.kind === "failure") {
    body = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => {
          confirm.mutate(link);
        }}
      />
    );
  } else {
    body = <LoadingState label={tc("loading")} />;
  }

  return (
    <SafeAreaView testID="authCallback" style={styles.screen}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
});
