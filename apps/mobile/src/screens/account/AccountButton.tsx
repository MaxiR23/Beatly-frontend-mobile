// INFO: the header's account avatar and its sheet with the profile row, report a problem, my reports, all reports (only for a developer or an admin) and log out; the row opens the profile screen, the report entries open the form or the reports sheet in its place, the all reports entry opens its screen, shared by the home, explore, search and library tabs.
import { profileName } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { ActionRow, Avatar, AvatarRow, Button, Sheet, Text } from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useSignOut } from "../../queries/useAuth.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { MyReportsSheet } from "../bugReports/MyReportsSheet.tsx";
import { ReportProblemSheet } from "../bugReports/ReportProblemSheet.tsx";
import { useReduceMotion } from "../player/useReduceMotion.ts";

export function AccountButton() {
  const tc = useT("common");
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfile();
  const signOut = useSignOut();
  const [open, setOpen] = useState<"account" | "report" | "reports" | null>(null);

  const canTriage = profile.data?.role === "developer" || profile.data?.role === "admin";

  const close = () => {
    setOpen(null);
  };

  return (
    <>
      <Avatar
        name={profile.data ? profileName(profile.data) : null}
        accessibilityLabel={tc("account.open")}
        onPress={() => {
          setOpen("account");
        }}
      />
      <Sheet
        reduceMotion={reduceMotion}
        visible={open === "account"}
        onClose={close}
        closeLabel={tc("account.close")}
        bottomInset={insets.bottom}
      >
        <AvatarRow
          identity={
            profile.data
              ? {
                  name: profileName(profile.data),
                  title: profile.data.display_name ?? tc("account.noName"),
                }
              : null
          }
          subtitle={tc("account.viewProfile")}
          accessibilityLabel={
            profile.data
              ? tc("account.profileRow", {
                  name: profile.data.display_name ?? tc("account.noName"),
                })
              : tc("account.viewProfile")
          }
          onPress={() => {
            close();
            router.push("/profile");
          }}
        />
        <View style={styles.entries}>
          <ActionRow
            icon="flag"
            label={tc("account.report")}
            onPress={() => {
              setOpen("report");
            }}
          />
          <ActionRow
            icon="inbox"
            label={tc("account.myReports")}
            onPress={() => {
              setOpen("reports");
            }}
          />
          {canTriage ? (
            <ActionRow
              icon="eye"
              label={tc("account.allReports")}
              testID="account-all-reports"
              onPress={() => {
                close();
                router.push("/bug-reports");
              }}
            />
          ) : null}
        </View>
        <Button
          variant="secondary"
          label={tc("account.logout")}
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
      </Sheet>
      {open === "report" ? <ReportProblemSheet track={null} onClose={close} /> : null}
      {open === "reports" ? <MyReportsSheet onClose={close} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  entries: { gap: spacing.xs },
});
