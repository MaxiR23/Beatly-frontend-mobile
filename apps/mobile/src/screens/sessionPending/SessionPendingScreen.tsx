// INFO: what the root stack mounts while the stored session is read: the app background only, under the native splash, so no login or home is mounted before the status is known.
import { color } from "@beatly/ui";
import { StyleSheet, View } from "react-native";

export function SessionPendingScreen() {
  return <View testID="sessionPending" style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
});
