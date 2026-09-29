// INFO: the home tab: the account avatar and sheet, and the recently played and own playlists shelves.
import type { PlaylistListItem, RecentEntity } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Carousel,
  EmptyState,
  ErrorState,
  LoadingState,
  floatingTabBarClearance,
  type CarouselItem,
} from "@beatly/ui/native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { usePlaylists } from "../../queries/usePlaylists.ts";
import { useRecents } from "../../queries/useRecents.ts";
import { AccountButton } from "../account/AccountButton.tsx";

function toRecentItem(recent: RecentEntity): CarouselItem {
  return {
    key: `${recent.entity_type}:${recent.entity_id}`,
    title: recent.metadata.title ?? undefined,
    subtitle: recent.metadata.subtitle ?? undefined,
    urls: recent.metadata.thumbnail_url ? [recent.metadata.thumbnail_url] : [],
    shape: recent.entity_type === "artist" ? "round" : "square",
  };
}

function toPlaylistItem(playlist: PlaylistListItem): CarouselItem {
  return {
    key: playlist.id,
    title: playlist.title,
    subtitle: playlist.description ?? undefined,
    urls: playlist.thumbnail_urls,
    shape: "square",
  };
}

export function HomeScreen() {
  const t = useT("home");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const recents = useRecents();
  const playlists = usePlaylists();

  const clearance = { paddingBottom: floatingTabBarClearance(insets.bottom) };

  let body;
  if (recents.isPending || playlists.isPending) {
    body = (
      <View style={[styles.state, clearance]}>
        <LoadingState label={tc("loading")} />
      </View>
    );
  } else if (recents.isError || playlists.isError) {
    body = (
      <View style={[styles.state, clearance]}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => {
            if (recents.isError) void recents.refetch();
            if (playlists.isError) void playlists.refetch();
          }}
        />
      </View>
    );
  } else if (recents.data.length === 0 && playlists.data.length === 0) {
    body = (
      <View style={[styles.state, clearance]}>
        <EmptyState icon="music" message={t("empty")} />
      </View>
    );
  } else {
    body = (
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.sections, clearance]}
      >
        {recents.data.length > 0 ? (
          <Carousel testID="recents" title={t("recents")} items={recents.data.map(toRecentItem)} />
        ) : null}
        {playlists.data.length > 0 ? (
          <Carousel
            testID="playlists"
            title={t("playlists")}
            items={playlists.data.map(toPlaylistItem)}
            onEndReached={playlists.loadMore}
          />
        ) : null}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView testID="home" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AccountButton />
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  state: { flex: 1 },
  sections: { gap: spacing.xl },
});
