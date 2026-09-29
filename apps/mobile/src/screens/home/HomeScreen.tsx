// INFO: the signed-in placeholder: greets the caller by profile name and offers log out, until the tabs replace it.
import { profileName, profileReasonSchema } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import { Button, ErrorState, LoadingState, Text } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useSignOut } from "../../queries/useAuth.ts";
import { useProfile } from "../../queries/useProfile.ts";

export function HomeScreen() {
  const t = useT("home");
  const tc = useT("common");
  const { data, error, isPending, refetch } = useProfile();
  const signOut = useSignOut();

  const logout = (
    <>
      <Button
        variant="secondary"
        label={t("logout")}
        loading={signOut.isPending}
        onPress={() => {
          signOut.mutate();
        }}
      />
      {signOut.data?.kind === "failure" ? (
        <Text variant="meta" tone="error">
          {tc("error.generic")}
        </Text>
      ) : null}
    </>
  );

  let body;
  if (isPending) {
    body = <LoadingState label={tc("loading")} />;
  } else if (
    error instanceof OutcomeError &&
    error.outcome.kind === "api_failure" &&
    error.outcome.reason === profileReasonSchema.enum.profile_not_found
  ) {
    body = (
      <View style={styles.content}>
        <Text variant="body" tone="secondary" align="center">
          {t("profileNotFound")}
        </Text>
        {logout}
      </View>
    );
  } else if (error !== null) {
    body = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  } else {
    const name = profileName(data);
    body = (
      <View style={styles.content}>
        <Text variant="title">{name === null ? t("greetingNoName") : t("greeting", { name })}</Text>
        {logout}
      </View>
    );
  }

  return (
    <SafeAreaView testID="home" style={styles.screen}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  content: {
    flexGrow: 1,
    padding: layout.gutter,
    gap: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
