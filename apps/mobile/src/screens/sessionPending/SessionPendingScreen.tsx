// INFO: what the root stack mounts while the stored session or the profile is read: the app background with a loading state, under the native splash on a cold start and in view after an in-app sign-in while the profile is read, so no login, onboarding or home is mounted before the gate is decided; when the profile read failed, the error state with its cause and retry (the loading state while it retries).
import { color } from "@beatly/ui";
import { LoadingState } from "@beatly/ui/native";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { FailureState } from "../failure/FailureState.tsx";
import { useOnboardingGate } from "../onboarding/useOnboardingGate.ts";

export function SessionPendingScreen() {
  const tc = useT("common");
  const { gate, failure, retry, retrying } = useOnboardingGate();
  return (
    <View testID="sessionPending" style={styles.screen}>
      {gate === "failed" && !retrying ? (
        <FailureState cause={failure} onRetry={retry} />
      ) : (
        <LoadingState label={tc("loading")} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
});
