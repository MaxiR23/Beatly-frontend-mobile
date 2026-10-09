// INFO: the header's account avatar and its sheet with report a problem, my reports and log out, which opens the report form or the reports sheet in its place, shared by the home, explore, search and library tabs.
import { profileName } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { ActionRow, Avatar, Button, Sheet, Text } from "@beatly/ui/native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useSignOut } from "../../queries/useAuth.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { MyReportsSheet } from "../bugReports/MyReportsSheet.tsx";
import { ReportProblemSheet } from "../bugReports/ReportProblemSheet.tsx";

export function AccountButton() {
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const signOut = useSignOut();
  const [open, setOpen] = useState<"account" | "report" | "reports" | null>(null);

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
        visible={open === "account"}
        onClose={close}
        closeLabel={tc("account.close")}
        bottomInset={insets.bottom}
      >
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
