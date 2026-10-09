// INFO: the edit-playlist sheet: the title and the description prefilled, Save sends only what changed to PATCH /playlists/{id} and is disabled while nothing changed or the title is invalid; it closes on success and stays open with an inline error and the input kept on failure.
import { spacing } from "@beatly/ui";
import { Button, Input, Sheet, Text } from "@beatly/ui/native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useUpdatePlaylist } from "../../queries/usePlaylists.ts";
import {
  PLAYLIST_TITLE_MAX_LENGTH,
  canCreatePlaylist,
  isTitleTooLong,
} from "../library/playlistRules.ts";
import { playlistEditPatch } from "./playlistEdit.ts";

interface EditPlaylistSheetProps {
  playlist: { id: string; title: string; description: string | null };
  onClose: () => void;
}

export function EditPlaylistSheet({ playlist, onClose }: EditPlaylistSheetProps) {
  const t = useT("playlist");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const update = useUpdatePlaylist();
  const [name, setName] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description ?? "");
  const patch = playlistEditPatch(playlist, { title: name, description });

  const close = () => {
    update.reset();
    onClose();
  };

  const submit = () => {
    if (patch === null) return;
    update.mutate({ id: playlist.id, input: patch }, { onSuccess: close });
  };

  return (
    <Sheet visible onClose={close} closeLabel={t("edit.close")} bottomInset={insets.bottom}>
      <View style={styles.form}>
        <Text variant="subtitle">{t("edit.title")}</Text>
        <Input
          label={t("edit.name")}
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          {...(isTitleTooLong(name)
            ? { error: t("edit.nameTooLong", { max: PLAYLIST_TITLE_MAX_LENGTH }) }
            : {})}
        />
        <Input
          label={t("edit.description")}
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
        />
        {update.isError ? (
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
              disabled={patch === null || !canCreatePlaylist(name)}
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
