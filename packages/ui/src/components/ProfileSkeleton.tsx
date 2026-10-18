// INFO: the static loading skeleton of the profile screen: the large avatar circle, the name and username bars, and the info card with two caption-and-value pairs, in the skeleton base color. It draws no motion.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Card } from "./Card.tsx";
import { SkeletonBar, SkeletonCircle } from "./Skeleton.tsx";

export function ProfileSkeleton({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      testID="profile-skeleton"
      style={styles.root}
    >
      <View style={styles.identity}>
        <SkeletonCircle size="profile" />
        <SkeletonBar text="title" width="title" />
        <SkeletonBar text="body" width="meta" />
      </View>
      <Card>
        <View style={styles.pair}>
          <SkeletonBar text="label" width="rowMeta" />
          <SkeletonBar text="body" width="rowTitle" />
        </View>
        <View style={styles.pair}>
          <SkeletonBar text="label" width="rowMeta" />
          <SkeletonBar text="body" width="rowTitle" />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: layout.gutter, gap: spacing.xl },
  identity: { alignItems: "center", gap: spacing.sm },
  pair: { gap: spacing.xxs },
});
