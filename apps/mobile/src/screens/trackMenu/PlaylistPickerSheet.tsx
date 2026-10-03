// INFO: the playlist picker as a sheet: the caller's playlists (paged), a new playlist row that asks for a name, the playlists that already hold the track checked and not pressable; adding, also to a new playlist, ends in a confirmation inside the sheet and then closes it; a failure shows the generic error inline and keeps the sheet open; loading, the empty list and an error with retry are drawn.
import { addTrackInputOf, type PlayableTrack, type PlaylistListItem } from "@beatly/core";
import { motion, spacing } from "@beatly/ui";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  MediaRow,
  Notice,
  Sheet,
  Text,
} from "@beatly/ui/native";
import { useEffect, useState, type ReactNode } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
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

interface PlaylistPickerSheetProps {
  track: PlayableTrack;
  onClose: () => void;
}

export function PlaylistPickerSheet({ track, onClose }: PlaylistPickerSheetProps) {
  const t = useT("trackMenu");
  const insets = useSafeAreaInsets();
  return (
    <Sheet
      visible
      onClose={onClose}
      closeLabel={t("close")}
      bottomInset={insets.bottom}
      topInset={insets.top}
    >
      <PickerBody track={track} onClose={onClose} />
    </Sheet>
  );
}

function PickerBody({ track, onClose }: PlaylistPickerSheetProps) {
  const t = useT("trackMenu");
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
  let list: ReactNode;
  if (playlists.isPending || owned.isPending) {
    list = <LoadingState label={tc("loading")} />;
  } else if (playlists.isError || owned.isError) {
    list = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => {
          if (playlists.isError) void playlists.refetch();
          if (owned.isError) void owned.refetch();
        }}
      />
    );
  } else if (playlists.data.length === 0) {
    list = <EmptyState icon="music" message={t("picker.empty")} />;
  } else {
    list = (
      <FlatList
        style={styles.list}
        data={playlists.data}
        keyExtractor={(playlist) => playlist.id}
        onEndReached={playlists.loadMore}
        renderItem={({ item }) =>
          heldIds.includes(item.id) ? (
            <MediaRow
              size="medium"
              shape="square"
              urls={item.thumbnail_urls}
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
              urls={item.thumbnail_urls}
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
      {naming ? (
        <View style={styles.form}>
          <Input
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
          urls={[]}
          title={t("picker.newPlaylist")}
          onPress={() => {
            setNaming(true);
          }}
        />
      )}
      {list}
      {add.isError || create.isError ? (
        <Text variant="meta" tone="error">
          {tc("error.generic")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: spacing.md },
  list: { flexShrink: 1 },
  form: { gap: spacing.lg },
  actions: { flexDirection: "row", gap: spacing.md },
  action: { flex: 1 },
  held: { padding: spacing.sm },
});
