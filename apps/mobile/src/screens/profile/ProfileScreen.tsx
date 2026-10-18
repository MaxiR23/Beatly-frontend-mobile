// INFO: the caller's profile: the large avatar, the display name or No name, @username or No username, the role badge for every role but user, the email from the stored session and the month and year joined in a card, and Edit profile opening the edit sheet; a cached profile is drawn at once; with none yet, a static skeleton of the layout or an error with retry.
import { profileName } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  IconButton,
  ProfileSkeleton,
  SkeletonBar,
  Text,
} from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useEmail } from "../../queries/useAuth.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { reportDate } from "../bugReports/reportDate.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";
import { EditProfileSheet } from "./EditProfileSheet.tsx";

const roleKey = {
  admin: "roles.admin",
  developer: "roles.developer",
  tester: "roles.tester",
} as const;

export function ProfileScreen() {
  const t = useT("profile");
  const tc = useT("common");
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const profile = useProfile();
  const email = useEmail();
  const [editing, setEditing] = useState(false);

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const data = profile.data;
  let body;
  // Data first: a cached profile is drawn at once and kept when a background refetch fails (the owner's decision for this screen); the skeleton and the error are only for when there is no profile yet.
  if (data === undefined && profile.isError) {
    body = (
      <View style={styles.state}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => {
            void profile.refetch();
            if (email.isError) void email.refetch();
          }}
        />
      </View>
    );
  } else if (data === undefined) {
    body = <ProfileSkeleton label={tc("loading")} />;
  } else if (email.isError) {
    body = (
      <View style={styles.state}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => {
            void email.refetch();
          }}
        />
      </View>
    );
  } else {
    const joined = reportDate(data.created_at);
    body = (
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <View style={styles.identity}>
          <Avatar name={profileName(data)} size="profile" />
          <Text variant="title" align="center">
            {data.display_name ?? tc("account.noName")}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            {data.username !== null ? t("username", { username: data.username }) : t("noUsername")}
          </Text>
          {data.role !== "user" ? (
            <Badge label={t(roleKey[data.role])} tone="primary" testID="profile-role" />
          ) : null}
        </View>
        <Card>
          {email.isPending ? (
            <View style={styles.pair} testID="profile-email-skeleton">
              <Text variant="label" tone="secondary">
                {t("email")}
              </Text>
              <SkeletonBar text="body" width="rowTitle" />
            </View>
          ) : typeof email.data === "string" ? (
            <View style={styles.pair}>
              <Text variant="label" tone="secondary">
                {t("email")}
              </Text>
              <Text variant="body">{email.data}</Text>
            </View>
          ) : null}
          {joined !== null ? (
            <View style={styles.pair}>
              <Text variant="label" tone="secondary">
                {t("memberSince")}
              </Text>
              <Text variant="body">
                {t("memberSinceDate", {
                  date: joined,
                  formatParams: { date: { month: "long", year: "numeric" } },
                })}
              </Text>
            </View>
          ) : null}
        </Card>
        <Button
          variant="secondary"
          shape="field"
          label={t("editProfile")}
          onPress={() => {
            setEditing(true);
          }}
        />
      </ScrollView>
    );
  }

  return (
    <SafeAreaView testID="profile" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" accessibilityLabel={t("back")} onPress={goBack} />
        <Text variant="title" numberOfLines={1}>
          {t("title")}
        </Text>
      </View>
      {body}
      {editing && data ? (
        <EditProfileSheet
          profile={data}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  content: { paddingHorizontal: layout.gutter, gap: spacing.xl },
  identity: { alignItems: "center", gap: spacing.sm },
  pair: { gap: spacing.xxs },
  state: { flex: 1 },
});
