// INFO: the home tab: the account avatar and sheet, and the recently played and own playlists shelves.
import { profileName, type PlaylistListItem, type RecentEntity } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Carousel,
  EmptyState,
  ErrorState,
  LoadingState,
  floatingTabBarClearance,
  type CarouselItem,
} from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { usePlaylists } from "../../queries/usePlaylists.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { useRecents } from "../../queries/useRecents.ts";
import { AccountButton } from "../account/AccountButton.tsx";

export function HomeScreen() {
  const t = useT("home");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recents = useRecents();
  const playlists = usePlaylists();
  const profile = useProfile();
  const owner = profile.data ? profileName(profile.data) : null;

  const openAlbum = (id: string) => {
    router.push({ pathname: "/album/[id]", params: { id } });
  };

  const recentLine = (recent: RecentEntity) => {
    if (recent.entity_type === "artist") return t("kind.artist");
    const kind = t(recent.entity_type === "album" ? "kind.album" : "kind.playlist");
    const subtitle = recent.metadata.subtitle;
    return subtitle ? t("meta", { kind, owner: subtitle }) : kind;
  };

  const toRecentItem = (recent: RecentEntity): CarouselItem => ({
    key: `${recent.entity_type}:${recent.entity_id}`,
    title: recent.metadata.title ?? undefined,
    subtitle: recentLine(recent),
    urls: recent.metadata.thumbnail_url ? [recent.metadata.thumbnail_url] : [],
    shape: recent.entity_type === "artist" ? "round" : "square",
    onPress:
      recent.entity_type === "album"
        ? () => {
            openAlbum(recent.entity_id);
          }
        : undefined,
  });

  const toPlaylistItem = (playlist: PlaylistListItem): CarouselItem => ({
    key: playlist.id,
    title: playlist.title,
    subtitle: owner ?? undefined,
    urls: playlist.thumbnail_urls,
    shape: "square",
  });

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
