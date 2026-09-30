// INFO: a genre's curated playlists in a two-column grid, filtered by category on the loaded page.
import type { GenrePlaylistListItem } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaGrid,
  Text,
  type CarouselItem,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useGenreCategories, useGenrePlaylists } from "../../queries/useGenres.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";

export function GenreScreen() {
  const t = useT("genre");
  const tc = useT("common");
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const { slug = "", name } = useLocalSearchParams<{ slug?: string; name?: string }>();
  const playlists = useGenrePlaylists(slug);
  const categories = useGenreCategories(slug);
  const [category, setCategory] = useState<string | null>(null);

  const clearance = { paddingBottom: tabBarClearance };

  function goBack() {
    // A deep link has nothing to go back to, so it lands on the explore list.
    if (router.canGoBack()) router.back();
    else router.replace("/explore");
  }

  function toGridItem(playlist: GenrePlaylistListItem): CarouselItem {
    return {
      key: playlist.id,
      title: playlist.title,
      subtitle: t("tracks", { count: playlist.track_count }),
      urls:
        playlist.thumbnail_urls.length > 0
          ? playlist.thumbnail_urls
          : playlist.thumbnail_url !== null
            ? [playlist.thumbnail_url]
            : [],
      shape: "square",
      onPress: () => {
        router.push({ pathname: "/playlist/[id]", params: { id: playlist.id, source: "genre" } });
      },
    };
  }

  let body;
  if (playlists.isPending || categories.isPending) {
    body = (
      <View style={[styles.state, clearance]}>
        <LoadingState label={tc("loading")} />
      </View>
    );
  } else if (playlists.isError || categories.isError) {
    body = (
      <View style={[styles.state, clearance]}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => {
            if (playlists.isError) void playlists.refetch();
            if (categories.isError) void categories.refetch();
          }}
        />
      </View>
    );
  } else if (playlists.data.length === 0) {
    body = (
      <View style={[styles.state, clearance]}>
        <EmptyState icon="music" message={t("empty")} />
      </View>
    );
  } else {
    const visible =
      category === null ? playlists.data : playlists.data.filter((p) => p.category === category);
    body = (
      <View style={styles.content}>
        {categories.data.length > 0 ? (
          <View style={styles.chips}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsList}
            >
              <Chip
                label={t("all")}
                selected={category === null}
                onPress={() => {
                  setCategory(null);
                }}
              />
              {categories.data.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={category === item}
                  onPress={() => {
                    setCategory(item);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
        {visible.length === 0 ? (
          <View style={[styles.state, clearance]}>
            <EmptyState icon="music" message={t("emptyCategory")} />
          </View>
        ) : (
          <MediaGrid
            testID="genre-playlists"
            items={visible.map(toGridItem)}
            bottomPadding={tabBarClearance}
          />
        )}
      </View>
    );
  }

  return (
    <SafeAreaView testID="genre" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" accessibilityLabel={t("back")} onPress={goBack} />
        <Text variant="title" numberOfLines={1}>
          {name ?? ""}
        </Text>
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  state: { flex: 1 },
  content: { flex: 1 },
  chips: { marginBottom: spacing.md },
  chipsList: { paddingHorizontal: layout.gutter, gap: spacing.sm },
});
