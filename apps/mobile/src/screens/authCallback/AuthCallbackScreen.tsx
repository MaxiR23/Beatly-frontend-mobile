// INFO: the email link callback: verifies the one-time token once, then redirects home, or draws the invalid link state (an empty state with the way back to login) or, for any other failure, the error state with its cause and retry; an offline failure retries by itself when the connection returns.
import type { EmailLink } from "@beatly/core";
import { color } from "@beatly/ui";
import { EmptyState, LoadingState } from "@beatly/ui/native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { authFailureCause } from "../../queries/failureCause.ts";
import { useConfirmEmail } from "../../queries/useAuth.ts";
import { useOnline } from "../../queries/useOnline.ts";
import { FailureState } from "../failure/FailureState.tsx";
import { useRetryOnReconnect } from "../failure/useRetryOnReconnect.ts";

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

  const online = useOnline();
  const retryable = confirm.data?.kind === "failure" && confirm.data.reason !== "link_invalid";
  // The link is read again from the params: the hook only fires when a failure exists, which needs a link.
  useRetryOnReconnect(retryable ? authFailureCause(online) : null, () => {
    if (link !== null) confirm.mutate(link);
  });

  const backToLogin = () => {
    router.replace("/login");
  };

  let body;
  if (link === null) {
    body = (
      <EmptyState
        icon="mail"
        message={t("invalidLink")}
        action={{ label: t("backToLogin"), onPress: backToLogin }}
      />
    );
  } else if (confirm.data?.kind === "success") {
    body = <Redirect href="/" />;
  } else if (confirm.data?.kind === "failure" && confirm.data.reason === "link_invalid") {
    body = (
      <EmptyState
        icon="mail"
        message={t("invalidLink")}
        action={{ label: t("backToLogin"), onPress: backToLogin }}
      />
    );
  } else if (confirm.data?.kind === "failure") {
    body = (
      <FailureState
        cause={authFailureCause(online)}
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
