// INFO: the status strip: one line about the connection or a failed track, announced; a capsule of glass on iOS, a radius.sm rectangle on a raised surface on Android; a button when it retries.
import { Pressable, StyleSheet, View } from "react-native";

import { spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { Icon } from "./Icon.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";
import { Text } from "./Text.tsx";
import { useAnnounce } from "./useAnnounce.ts";

interface StatusStripProps {
  icon: "wifiOff" | "alert";
  message: string;
  onPress?: () => void;
  testID?: string;
}

export function StatusStrip({ icon, message, onPress, testID }: StatusStripProps) {
  useAnnounce(message);
  const press = pressFeedback();
  const content = (
    <>
      <Icon name={icon} size="sm" tone="primary" />
      <Text variant="meta" tone="primary" numberOfLines={1}>
        {message}
      </Text>
    </>
  );
  return (
    <GlassSurface
      variant={isAndroidVariant() ? "stripRect" : "strip"}
      {...(testID === undefined ? {} : { testID })}
    >
      {onPress === undefined ? (
        <View
          style={styles.content}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="status-strip-content"
        >
          {content}
        </View>
      ) : (
        <Pressable
          android_ripple={press.android_ripple}
          accessibilityRole="button"
          accessibilityLabel={message}
          accessibilityLiveRegion="polite"
          onPress={onPress}
          style={({ pressed }) => [styles.content, press.style(pressed)]}
        >
          {content}
        </Pressable>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
