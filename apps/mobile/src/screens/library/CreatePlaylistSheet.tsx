// INFO: the create-playlist sheet: a name, an optional description and a public switch, sent to POST /playlists; it stays open with an inline error when creation fails.
import { spacing } from "@beatly/ui";
import { Button, Input, Sheet, SwitchRow, Text } from "@beatly/ui/native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { useCreatePlaylist } from "../../queries/usePlaylists.ts";
import { PLAYLIST_TITLE_MAX_LENGTH, canCreatePlaylist, isTitleTooLong } from "./playlistRules.ts";
import { useReduceMotion } from "../player/useReduceMotion.ts";

interface CreatePlaylistSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreatePlaylistSheet({ visible, onClose }: CreatePlaylistSheetProps) {
  const t = useT("library");
  const reduceMotion = useReduceMotion();
  const tc = useT("common");
  const insets = useWindowInsets();
  const create = useCreatePlaylist();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const close = () => {
    onClose();
  };

  // The fields clear once the close has ended, so the form does not blank while it slides down.
  const clear = () => {
    setName("");
    setDescription("");
    setIsPublic(false);
    create.reset();
  };

  const submit = () => {
    const trimmedDescription = description.trim();
    create.mutate(
      {
        title: name.trim(),
        is_public: isPublic,
        ...(trimmedDescription !== "" ? { description: trimmedDescription } : {}),
      },
      { onSuccess: close },
    );
  };

  return (
    <Sheet
      reduceMotion={reduceMotion}
      visible={visible}
      onClosed={clear}
      onClose={close}
      closeLabel={t("create.close")}
      bottomInset={insets.bottom}
    >
      <View style={styles.form}>
        <Text variant="subtitle">{t("create.title")}</Text>
        <Input
          reduceMotion={reduceMotion}
          label={t("create.name")}
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          {...(isTitleTooLong(name)
            ? { error: t("create.nameTooLong", { max: PLAYLIST_TITLE_MAX_LENGTH }) }
            : {})}
        />
        <Input
          reduceMotion={reduceMotion}
          label={t("create.description")}
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
        />
        <SwitchRow
          label={t("create.public")}
          helper={t("create.publicHelper")}
          value={isPublic}
          onValueChange={setIsPublic}
          reduceMotion={reduceMotion}
        />
        {create.isError ? (
          <Text variant="meta" tone="error">
            {tc("error.generic")}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button variant="secondary" shape="field" label={t("create.cancel")} onPress={close} />
          </View>
          <View style={styles.action}>
            <Button
              variant="primary"
              shape="field"
              label={t("create.submit")}
              loading={create.isPending}
              disabled={!canCreatePlaylist(name)}
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
