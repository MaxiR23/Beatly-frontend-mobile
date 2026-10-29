// INFO: the header's account avatar and its sheet with the profile row, report a problem, my reports, all reports (only for a developer or an admin) and log out; the row opens the profile screen, the report entries open the form or the reports sheet in its place, the all reports entry opens its screen, shared by the home, explore, search and library tabs.
import { profileName } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { ActionRow, Avatar, AvatarRow, Button, Sheet, Text } from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { useSignOut } from "../../queries/useAuth.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { MyReportsSheet } from "../bugReports/MyReportsSheet.tsx";
import { ReportProblemSheet } from "../bugReports/ReportProblemSheet.tsx";
import { useReduceMotion } from "../player/useReduceMotion.ts";
import { useSheetPresence } from "../trackMenu/useSheetPresence.ts";

export function AccountButton() {
  const tc = useT("common");
  const reduceMotion = useReduceMotion();
  const insets = useWindowInsets();
  const router = useRouter();
  const profile = useProfile();
  const signOut = useSignOut();
  const sheet = useSheetPresence<"account" | "report" | "reports">();

  const canTriage = profile.data?.role === "developer" || profile.data?.role === "admin";

  const close = () => {
    sheet.hide();
  };

  return (
    <>
      <Avatar
        name={profile.data ? profileName(profile.data) : null}
        accessibilityLabel={tc("account.open")}
        onPress={() => {
          sheet.show("account");
        }}
      />
      <Sheet
        reduceMotion={reduceMotion}
        visible={sheet.current === "account" && sheet.visible}
        onClosed={sheet.closed}
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
              sheet.show("report");
            }}
          />
          <ActionRow
            icon="inbox"
            label={tc("account.myReports")}
            onPress={() => {
              sheet.show("reports");
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
      {sheet.current === "report" ? (
        <ReportProblemSheet
          track={null}
          visible={sheet.visible}
          onClosed={sheet.closed}
          onClose={close}
        />
      ) : null}
      {sheet.current === "reports" ? (
        <MyReportsSheet visible={sheet.visible} onClosed={sheet.closed} onClose={close} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  entries: { gap: spacing.xs },
});
