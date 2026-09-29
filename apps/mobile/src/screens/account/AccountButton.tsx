// INFO: the header's account avatar and its sheet with log out, shared by the home and explore tabs.
import { profileName } from "@beatly/core";
import { Avatar, Button, Sheet, Text } from "@beatly/ui/native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useSignOut } from "../../queries/useAuth.ts";
import { useProfile } from "../../queries/useProfile.ts";

export function AccountButton() {
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Avatar
        name={profile.data ? profileName(profile.data) : null}
        accessibilityLabel={tc("account.open")}
        onPress={() => {
          setOpen(true);
        }}
      />
      <Sheet
        visible={open}
        onClose={() => {
          setOpen(false);
        }}
        closeLabel={tc("account.close")}
        bottomInset={insets.bottom}
      >
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
    </>
  );
}
