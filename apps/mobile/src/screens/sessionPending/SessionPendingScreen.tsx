// INFO: what the root stack mounts while the stored session or the profile is read: the app background with a loading state, under the native splash on a cold start and in view after an in-app sign-in while the profile is read, so no login, onboarding or home is mounted before the gate is decided; when the profile read failed, the generic error with retry (the loading state while it retries).
import { color } from "@beatly/ui";
import { ErrorState, LoadingState } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useOnboardingGate } from "../onboarding/useOnboardingGate.ts";

export function SessionPendingScreen() {
  const tc = useT("common");
  const { gate, retry, retrying } = useOnboardingGate();
  return (
    <View testID="sessionPending" style={styles.screen}>
      {gate === "failed" && !retrying ? (
        <ErrorState message={tc("error.generic")} retryLabel={tc("retry")} onRetry={retry} />
      ) : (
        <LoadingState label={tc("loading")} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
});
