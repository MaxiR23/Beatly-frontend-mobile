// INFO: the edit-profile sheet: the name and the username prefilled, Save sends only what changed to PATCH /profile/me and is disabled while nothing changed or the input is invalid; a taken username shows under its field, any other failure the generic error, both keeping the input; it closes once the profile has refetched.
import type { Profile } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { Button, Input, Sheet, Text } from "@beatly/ui/native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useUpdateProfile } from "../../queries/useProfile.ts";
import {
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  canSaveProfile,
  isNameTooLong,
  profileEditPatch,
  usernameProblem,
} from "./profileEdit.ts";

interface EditProfileSheetProps {
  profile: Profile;
  onClose: () => void;
}

function isUsernameTaken(error: unknown): boolean {
  return (
    error instanceof OutcomeError &&
    error.outcome.kind === "api_failure" &&
    error.outcome.reason === "username_taken"
  );
}

export function EditProfileSheet({ profile, onClose }: EditProfileSheetProps) {
  const t = useT("profile");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const update = useUpdateProfile();
  const [name, setName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const patch = profileEditPatch(profile, { name, username });
  const problem = usernameProblem(profile.username, username);
  // Only for the value the backend rejected: editing the username clears the message.
  const taken = isUsernameTaken(update.error) && update.variables?.username === username;

  const close = () => {
    update.reset();
    onClose();
  };

  const submit = () => {
    if (patch === null) return;
    update.mutate(patch, { onSuccess: close });
  };

  let usernameError: string | undefined;
  if (problem === "required") usernameError = t("edit.usernameRequired");
  else if (problem === "invalid") usernameError = t("edit.usernameInvalid");
  else if (problem === "tooShort")
    usernameError = t("edit.usernameTooShort", { min: USERNAME_MIN_LENGTH });
  else if (problem === "tooLong")
    usernameError = t("edit.usernameTooLong", { max: USERNAME_MAX_LENGTH });
  else if (taken) usernameError = t("edit.usernameTaken");

  return (
    <Sheet visible onClose={close} closeLabel={t("edit.close")} bottomInset={insets.bottom}>
      <View style={styles.form}>
        <Text variant="subtitle">{t("edit.title")}</Text>
        <Input
          label={t("edit.name")}
          value={name}
          onChangeText={setName}
          placeholder={t("edit.namePlaceholder")}
          autoCapitalize="words"
          autoComplete="name"
          {...(isNameTooLong(name)
            ? { error: t("edit.nameTooLong", { max: NAME_MAX_LENGTH }) }
            : {})}
        />
        <Input
          label={t("edit.username")}
          value={username}
          onChangeText={setUsername}
          prefix={t("edit.usernamePrefix")}
          placeholder={t("edit.usernamePlaceholder")}
          autoCapitalize="none"
          {...(usernameError !== undefined ? { error: usernameError } : {})}
        />
        {update.isError && !isUsernameTaken(update.error) ? (
          <Text variant="meta" tone="error">
            {tc("error.generic")}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button variant="secondary" shape="field" label={t("edit.cancel")} onPress={close} />
          </View>
          <View style={styles.action}>
            <Button
              variant="primary"
              shape="field"
              label={t("edit.submit")}
              loading={update.isPending}
              disabled={!canSaveProfile(profile, { name, username })}
              onPress={submit}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  actions: { flexDirection: "row", gap: spacing.md },
  action: { flex: 1 },
});
