// INFO: the library tab: the fixed liked entry, then own playlists and saved albums and playlists newest first, and the create-playlist sheet.
import type { LibraryEntry } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaRow,
  Text,
  floatingTabBarClearance,
} from "@beatly/ui/native";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useLibrary } from "../../queries/useLibrary.ts";
import { AccountButton } from "../account/AccountButton.tsx";
import { CreatePlaylistSheet } from "./CreatePlaylistSheet.tsx";

export function LibraryScreen() {
  const t = useT("library");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const [creating, setCreating] = useState(false);

  const clearance = { paddingBottom: floatingTabBarClearance(insets.bottom) };

  const toRow = (entry: LibraryEntry) => {
    const liked = entry.source === "liked";
    const owner = liked || entry.source === "user" ? t("you") : entry.subtitle;
    const kind = t(entry.kind === "album" ? "kind.album" : "kind.playlist");
    return {
      title: liked ? t("liked") : entry.title,
      subtitle: owner !== null ? t("meta", { kind, owner }) : kind,
      icon: liked ? ("heart" as const) : undefined,
      urls:
        entry.source === "user"
          ? entry.thumbnail_urls
          : entry.thumbnail_url !== null
            ? [entry.thumbnail_url]
            : [],
    };
  };

  let body;
  if (library.isPending) {
    body = (
      <View style={[styles.state, clearance]}>
        <LoadingState label={tc("loading")} />
      </View>
    );
  } else if (library.isError) {
    body = (
      <View style={[styles.state, clearance]}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => void library.refetch()}
        />
      </View>
    );
  } else {
    const onlyLiked = library.data.every((entry) => entry.source === "liked");
    body = (
      <FlatList
        testID="library-list"
        data={library.data}
        keyExtractor={(entry) => `${entry.source}:${entry.kind}:${entry.id}`}
        renderItem={({ item }) => (
          <MediaRow testID="library-entry" size="medium" shape="square" {...toRow(item)} />
        )}
        onEndReached={library.loadMore}
        contentContainerStyle={[clearance, styles.list]}
        ListFooterComponent={onlyLiked ? <EmptyState icon="library" message={t("empty")} /> : null}
      />
    );
  }

  return (
    <SafeAreaView testID="library" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Text variant="title">{t("title")}</Text>
        <View style={styles.actions}>
          <IconButton
            icon="plus"
            accessibilityLabel={t("create.open")}
            onPress={() => {
              setCreating(true);
            }}
          />
          <AccountButton />
        </View>
      </View>
      {body}
      <CreatePlaylistSheet
        visible={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  state: { flex: 1 },
  list: { flexGrow: 1 },
});
