// INFO: the search tab: recent queries kept on the device while the field is empty, and the top artist, songs and albums of GET /search once it has text.
import type { CarouselItem } from "@beatly/ui/native";
import type { SearchAlbum, SearchArtistRef, SearchSong } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Carousel,
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  MediaRow,
  RecentRow,
  SearchBar,
  Text,
  floatingTabBarClearance,
} from "@beatly/ui/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import {
  useAddRecentSearch,
  useClearRecentSearches,
  useRecentSearches,
  useRemoveRecentSearch,
} from "../../queries/useRecentSearches.ts";
import { useSearch } from "../../queries/useSearch.ts";
import { AccountButton } from "../account/AccountButton.tsx";
import { formatDuration } from "./formatDuration.ts";
import { useDebouncedValue } from "./useDebouncedValue.ts";

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchScreen() {
  const t = useT("search");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const active = trimmed === "" ? "" : debounced;

  const results = useSearch(active);
  const recents = useRecentSearches();
  const add = useAddRecentSearch();
  const remove = useRemoveRecentSearch();
  const clear = useClearRecentSearches();

  const clearance = { paddingBottom: floatingTabBarClearance(insets.bottom) };

  const artistNames = (artists: readonly SearchArtistRef[]) =>
    artists.map((a) => a.name).join(t("song.artistSeparator"));
  const songMeta = (song: SearchSong) =>
    song.artists.length === 0
      ? formatDuration(song.duration_seconds)
      : t("song.meta", {
          artists: artistNames(song.artists),
          duration: formatDuration(song.duration_seconds),
        });
  const toAlbumItem = (album: SearchAlbum): CarouselItem => ({
    key: album.id,
    title: album.title,
    subtitle: album.artists.length > 0 ? artistNames(album.artists) : undefined,
    urls: album.thumbnail_url !== null ? [album.thumbnail_url] : [],
    shape: "square",
  });

  let body;
  if (trimmed === "") {
    if (recents.isPending) {
      body = (
        <View style={[styles.state, clearance]}>
          <LoadingState label={tc("loading")} />
        </View>
      );
    } else if (recents.isError) {
      body = (
        <View style={[styles.state, clearance]}>
          <ErrorState
            message={tc("error.generic")}
            retryLabel={tc("retry")}
            onRetry={() => void recents.refetch()}
          />
          <View style={styles.recoverAction}>
            <Link
              label={t("recent.clearAll")}
              onPress={() => {
                clear.mutate();
              }}
            />
          </View>
        </View>
      );
    } else if (recents.data.length === 0) {
      body = (
        <View style={[styles.state, clearance]}>
          <EmptyState icon="search" message={t("recent.empty")} />
        </View>
      );
    } else {
      body = (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={clearance}
        >
          <View style={styles.recentHeader}>
            <Text variant="section">{t("recent.title")}</Text>
            <Link
              label={t("recent.clearAll")}
              onPress={() => {
                clear.mutate();
              }}
            />
          </View>
          {recents.data.map((query) => (
            <RecentRow
              key={query}
              label={query}
              onPress={() => {
                setText(query);
                add.mutate(query);
              }}
              removeLabel={t("recent.remove", { query })}
              onRemove={() => {
                remove.mutate(query);
              }}
            />
          ))}
        </ScrollView>
      );
    }
  } else if (active === "" || results.isPending) {
    body = (
      <View style={[styles.state, clearance]}>
        <LoadingState label={tc("loading")} />
      </View>
    );
  } else if (results.isError) {
    body = (
      <View style={[styles.state, clearance]}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => void results.refetch()}
        />
      </View>
    );
  } else if (
    results.data.artist === null &&
    results.data.songs.length === 0 &&
    results.data.albums.length === 0
  ) {
    body = (
      <View style={[styles.state, clearance]}>
        <EmptyState icon="search" message={t("empty", { query: active })} />
      </View>
    );
  } else {
    const { artist, songs, albums } = results.data;
    body = (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.sections, clearance]}
      >
        {artist !== null ? (
          <MediaRow
            testID="search-artist"
            size="large"
            shape="round"
            urls={[]}
            title={artist.name}
            subtitle={t("artist")}
          />
        ) : null}
        {songs.length > 0 ? (
          <View style={styles.songs}>
            <View style={styles.sectionHeader}>
              <Text variant="section">{t("songs")}</Text>
            </View>
            {songs.map((song) => (
              <MediaRow
                key={song.track_id}
                shape="square"
                urls={[song.thumbnail_url]}
                title={song.title}
                subtitle={songMeta(song)}
              />
            ))}
          </View>
        ) : null}
        {albums.length > 0 ? (
          <Carousel testID="search-albums" title={t("albums")} items={albums.map(toAlbumItem)} />
        ) : null}
      </ScrollView>
    );
  }

  const mutationFailed =
    trimmed === "" && (add.isError || remove.isError || clear.isError) ? (
      <View style={styles.failure}>
        <Text variant="meta" tone="error">
          {tc("error.generic")}
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView testID="search" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Text variant="title">{t("title")}</Text>
        <AccountButton />
      </View>
      <View style={styles.bar}>
        <SearchBar
          value={text}
          onChangeText={setText}
          placeholder={t("placeholder")}
          accessibilityLabel={t("title")}
          clearLabel={t("clear")}
          onSubmit={() => {
            if (trimmed !== "") add.mutate(trimmed);
          }}
        />
      </View>
      {mutationFailed}
      {body}
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
  bar: { paddingHorizontal: layout.gutter, paddingBottom: spacing.sm },
  failure: { paddingHorizontal: layout.gutter, paddingBottom: spacing.sm },
  state: { flex: 1 },
  recoverAction: { alignItems: "center", paddingVertical: spacing.sm },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  sections: { gap: spacing.xl },
  songs: { gap: spacing.md },
  sectionHeader: { paddingHorizontal: layout.gutter },
});
