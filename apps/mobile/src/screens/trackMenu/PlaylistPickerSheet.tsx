// INFO: the playlist picker as a sheet: the caller's playlists (paged), a new playlist row that asks for a name, the playlists that already hold the track checked and not pressable; adding, also to a new playlist, ends in a confirmation inside the sheet and then closes it; a failure shows the generic error inline and keeps the sheet open; loading, the empty list and an error with retry are drawn.
import { addTrackInputOf, type PlayableTrack, type PlaylistListItem } from "@beatly/core";
import { motion, spacing } from "@beatly/ui";
import {
  Button,
  EmptyState,
  Icon,
  Input,
  LoadingState,
  MediaRow,
  Notice,
  Sheet,
  Text,
  ErrorText,
} from "@beatly/ui/native";
import { useEffect, useState, type ReactNode } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { queryFailure } from "../../queries/failureCause.ts";
import {
  useAddToPlaylist,
  useCreatePlaylistWithTrack,
  usePlaylists,
  usePlaylistsWithTrack,
} from "../../queries/usePlaylists.ts";
import {
  PLAYLIST_TITLE_MAX_LENGTH,
  canCreatePlaylist,
  isTitleTooLong,
} from "../library/playlistRules.ts";
import { FailureState } from "../failure/FailureState.tsx";
import { useReduceMotion } from "../player/useReduceMotion.ts";

interface PlaylistPickerSheetProps {
  visible: boolean;
  onClosed: () => void;
  track: PlayableTrack;
  onClose: () => void;
}

export function PlaylistPickerSheet({
  visible,
  onClosed,
  track,
  onClose,
}: PlaylistPickerSheetProps) {
  const t = useT("trackMenu");
  const reduceMotion = useReduceMotion();
  const insets = useWindowInsets();
  return (
    <Sheet
      reduceMotion={reduceMotion}
      visible={visible}
      onClosed={onClosed}
      onClose={onClose}
      closeLabel={t("close")}
      bottomInset={insets.bottom}
      topInset={insets.top}
    >
      <PickerBody track={track} onClose={onClose} />
    </Sheet>
  );
}

function PickerBody({ track, onClose }: Pick<PlaylistPickerSheetProps, "track" | "onClose">) {
  const t = useT("trackMenu");
  const reduceMotion = useReduceMotion();
  const tc = useT("common");
  const playlists = usePlaylists();
  const owned = usePlaylistsWithTrack(track.trackId);
  const add = useAddToPlaylist();
  const create = useCreatePlaylistWithTrack();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [addedTo, setAddedTo] = useState<string | null>(null);
  // The option is offered only for a track that maps to the body, so it is set here.
  const input = addTrackInputOf(track);
  const busy = add.isPending || create.isPending;

  useEffect(() => {
    if (addedTo === null) return;
    const timer = setTimeout(onClose, motion.duration.notice);
    return () => {
      clearTimeout(timer);
    };
  }, [addedTo, onClose]);

  if (input === null) return null;
  if (addedTo !== null) {
    return <Notice tone="success" message={t("picker.added", { title: addedTo })} />;
  }

  const addTo = (playlist: PlaylistListItem) => {
    if (busy) return;
    add.mutate(
      { playlist, input },
      {
        onSuccess: () => {
          setAddedTo(playlist.title);
        },
      },
    );
  };

  const submit = () => {
    if (busy || !canCreatePlaylist(name)) return;
    create.mutate(
      { title: name.trim(), input },
      {
        onSuccess: (playlist) => {
          setAddedTo(playlist.title);
        },
      },
    );
  };

  const heldIds = owned.data ?? [];
  const failure = queryFailure(playlists, owned);
  let list: ReactNode;
  if (failure !== null) {
    list = (
      <FailureState
        cause={failure}
        onRetry={() => {
          if (playlists.isError) void playlists.refetch();
          if (owned.isError) void owned.refetch();
        }}
      />
    );
  } else if (!playlists.isSuccess || !owned.isSuccess) {
    list = <LoadingState label={tc("loading")} />;
  } else if (playlists.data.length === 0) {
    list = <EmptyState icon="music" message={t("picker.empty")} />;
  } else {
    list = (
      <FlatList
        style={styles.list}
        testID="picker-list"
        data={playlists.data}
        keyExtractor={(playlist) => playlist.id}
        onEndReached={playlists.loadMore}
        renderItem={({ item }) =>
          heldIds.includes(item.id) ? (
            <MediaRow
              size="medium"
              shape="square"
              images={item.mosaic}
              title={item.title}
              trailing={
                <View accessible accessibilityLabel={t("picker.inPlaylist")} style={styles.held}>
                  <Icon name="check" tone="success" />
                </View>
              }
              testID={`picker-held-${item.id}`}
            />
          ) : (
            <MediaRow
              size="medium"
              shape="square"
              images={item.mosaic}
              title={item.title}
              onPress={() => {
                addTo(item);
              }}
            />
          )
        }
      />
    );
  }

  return (
    <View style={styles.body} testID="playlist-picker">
      <Text variant="subtitle">{t("picker.title")}</Text>
      <View style={styles.rows} testID="picker-rows">
        {naming ? (
          <View style={styles.form}>
            <Input
              reduceMotion={reduceMotion}
              label={t("picker.name")}
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
              {...(isTitleTooLong(name)
                ? { error: t("picker.nameTooLong", { max: PLAYLIST_TITLE_MAX_LENGTH }) }
                : {})}
            />
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button
                  variant="secondary"
                  shape="field"
                  label={t("picker.cancel")}
                  onPress={() => {
                    setNaming(false);
                    setName("");
                    create.reset();
                  }}
                />
              </View>
              <View style={styles.action}>
                <Button
                  variant="primary"
                  shape="field"
                  label={t("picker.create")}
                  loading={create.isPending}
                  disabled={!canCreatePlaylist(name)}
                  onPress={submit}
                />
              </View>
            </View>
          </View>
        ) : (
          <MediaRow
            icon="plus"
            size="medium"
            shape="square"
            images={[]}
            title={t("picker.newPlaylist")}
            onPress={() => {
              setNaming(true);
            }}
          />
        )}
        {list}
      </View>
      {add.isError || create.isError ? (
        <ErrorText
          message={tc("error.generic")}
          attempt={Math.max(add.submittedAt, create.submittedAt)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: spacing.md },
  rows: { flexShrink: 1 },
  list: { flexShrink: 1 },
  form: { gap: spacing.lg, paddingBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md },
  action: { flex: 1 },
  held: { padding: spacing.sm },
});
