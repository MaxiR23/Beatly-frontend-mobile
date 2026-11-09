// INFO: a form or screen error line in today's style (meta, error tone), announced: an alert with a polite live region on Android, useAnnounce on iOS; a new attempt with the same message is announced again.
import { View } from "react-native";

import { Text } from "./Text.tsx";
import { useAnnounce } from "./useAnnounce.ts";

interface ErrorTextProps {
  message: string;
  // Changes once per submit (a mutation's submittedAt), so the same message is announced again on a new attempt.
  attempt?: number | undefined;
  testID?: string | undefined;
}

export function ErrorText({ message, attempt, testID }: ErrorTextProps) {
  useAnnounce(message, attempt);
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" testID={testID}>
      <Text variant="meta" tone="error">
        {message}
      </Text>
    </View>
  );
}
