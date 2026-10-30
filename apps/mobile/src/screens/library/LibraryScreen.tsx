// INFO: the library tab: the fixed liked entry, then own playlists and saved albums, playlists and artists newest first, an all or artists filter (each its own list from the first page), and the create-playlist sheet.
import { profileName, type LibraryEntry } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaRow,
  Text,
} from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useLibrary, type LibraryFilter } from "../../queries/useLibrary.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { AccountButton } from "../account/AccountButton.tsx";
import { CreatePlaylistSheet } from "./CreatePlaylistSheet.tsx";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";

const filters = ["all", "artists"] as const;

export function LibraryScreen() {
  const t = useT("library");
  const tc = useT("common");
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const library = useLibrary(filter);
  const profile = useProfile();
  const name = profile.data ? profileName(profile.data) : null;
  const [creating, setCreating] = useState(false);

  const clearance = { paddingBottom: tabBarClearance };

  const toRow = (entry: LibraryEntry) => {
    const liked = entry.source === "liked";
    const owner = liked ? null : entry.source === "user" ? name : entry.subtitle;
    const kind = t(
      entry.kind === "album"
        ? "kind.album"
        : entry.kind === "artist"
          ? "kind.artist"
          : "kind.playlist",
    );
    return {
      shape: entry.kind === "artist" ? ("round" as const) : ("square" as const),
      title: liked ? t("liked") : entry.title,
      subtitle: owner !== null ? t("meta", { kind, owner }) : kind,
      icon: liked ? ("heart" as const) : undefined,
      images: entry.source === "user" ? entry.mosaic : entry.image !== null ? [entry.image] : [],
      onPress:
        entry.kind === "artist"
          ? () => {
              router.push({ pathname: "/artist/[id]", params: { id: entry.id } });
            }
          : entry.kind === "album"
            ? () => {
                router.push({ pathname: "/album/[id]", params: { id: entry.id } });
              }
            : entry.source === "liked" || entry.source === "user" || entry.source === "genre"
              ? () => {
                  router.push({
                    pathname: "/playlist/[id]",
                    params: { id: entry.id, source: entry.source },
                  });
                }
              : undefined,
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
          <MediaRow testID="library-entry" size="medium" {...toRow(item)} />
        )}
        onEndReached={library.loadMore}
        contentContainerStyle={[clearance, styles.list]}
        ListFooterComponent={
          filter === "artist" ? (
            library.data.length === 0 ? (
              <EmptyState icon="library" message={t("emptyArtists")} />
            ) : undefined
          ) : onlyLiked ? (
            <EmptyState icon="library" message={t("empty")} />
          ) : undefined
        }
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
      <View style={styles.chips}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
        >
          {filters.map((key) => (
            <Chip
              key={key}
              label={t(`filters.${key}`)}
              selected={filter === (key === "all" ? "all" : "artist")}
              onPress={() => {
                setFilter(key === "all" ? "all" : "artist");
              }}
            />
          ))}
        </ScrollView>
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
  chips: { marginBottom: spacing.md },
  chipsList: { paddingHorizontal: layout.gutter, gap: spacing.sm },
  state: { flex: 1 },
  list: { flexGrow: 1 },
});
