// INFO: a playlist, own, liked or genre by its source param: the detail base with its cover, title, creator, description, meta line and tracks paged by infinite scroll for own and liked; a genre playlist's header and tracks come in one request; unavailable for playlist_not_found; starting a list registers it as a recent.
import { profileName } from "@beatly/core";
import { color, layout, radius, spacing } from "@beatly/ui";
import {
  Avatar,
  DetailScreen,
  EmptyState,
  MediaRow,
  Text,
  type DetailBody,
  type DetailRow,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import brandIcon from "../../../assets/brand-icon.png";
import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { usePlaylistHeader, usePlaylistTracks } from "../../queries/usePlaylist.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { useRegisterRecent } from "../../queries/useRecents.ts";
import { useDominantColor } from "../detail/useDominantColor.ts";
import { playlistMeta } from "./playlistMeta.ts";
import { playlistSource } from "./playlistSource.ts";
import { toQueue } from "../player/queue.ts";
import { usePlaybackActions } from "../player/usePlayback.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";

function isNotFound(error: unknown): boolean {
  return (
    error instanceof OutcomeError &&
    error.outcome.kind === "api_failure" &&
    error.outcome.reason === "playlist_not_found"
  );
}

export function PlaylistScreen() {
  const t = useT("playlist");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const playback = usePlaybackActions();
  const registerRecent = useRegisterRecent();
  const { id = "", source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const kind = playlistSource(source);
  const header = usePlaylistHeader(kind, id);
  const tracks = usePlaylistTracks(kind, id);
  const profile = useProfile();
  const owner = profile.data ? profileName(profile.data) : null;

  // The cover of each kind.
  let cover: { urls: readonly string[]; icon?: "heart" } = { urls: [] };
  if (header.data?.source === "genre") {
    const { thumbnails, thumbnail_url } = header.data.playlist;
    cover = {
      urls: thumbnails.length > 0 ? thumbnails : thumbnail_url !== null ? [thumbnail_url] : [],
    };
  } else if (header.data?.source === "user") {
    cover = { urls: header.data.playlist.thumbnail_urls };
  } else if (header.data?.source === "liked") {
    cover = { urls: [], icon: "heart" };
  }
  const wash = useDominantColor(cover.urls[0] ?? null);

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const notFound = isNotFound(header.error) || isNotFound(tracks.error);

  let body: DetailBody;
  if (header.isPending || (kind !== "genre" && tracks.isPending)) {
    body = { kind: "loading", label: tc("loading") };
  } else if (notFound) {
    body = { kind: "unavailable", message: t("notFound") };
  } else if (header.isError || tracks.isError) {
    body = {
      kind: "error",
      message: tc("error.generic"),
      retryLabel: tc("retry"),
      onRetry: () => {
        if (header.isError) void header.refetch();
        if (tracks.isError) void tracks.refetch();
      },
    };
  } else {
    const data = header.data;
    const list = data.source === "genre" ? data.playlist.tracks : (tracks.data ?? []);
    let title: string;
    let creator: { mark: "avatar" | "brand"; name: string } | null = null;
    let description: string | null = null;
    let meta: Parameters<typeof playlistMeta>[0];
    if (data.source === "user") {
      title = data.playlist.title;
      creator = owner !== null ? { mark: "avatar", name: owner } : null;
      description = data.playlist.description;
      meta = {
        visibility: data.playlist.is_public ? "public" : "private",
        count: data.playlist.total_count,
        durationSeconds: data.playlist.total_duration_seconds,
      };
    } else if (data.source === "liked") {
      // The liked title is an identifier, not a display string.
      title = t("liked");
      meta = {
        visibility: null,
        count: data.playlist.total_count,
        durationSeconds: data.playlist.total_duration_seconds,
      };
    } else {
      title = data.playlist.title;
      creator = { mark: "brand", name: tc("brand") };
      description = data.playlist.description;
      meta = {
        visibility: null,
        count: data.playlist.track_count,
        durationSeconds: data.playlist.total_duration_seconds,
      };
    }

    const play = (tapped: number) => {
      const queue = toQueue(list, tapped, (track) => ({
        trackId: track.track_id,
        title: track.title,
        artists: track.artists,
        album: track.album,
        albumId: track.album_id,
        coverUrl: track.thumbnail_url,
        durationSeconds: track.duration_seconds,
      }));
      if (queue !== null) {
        void playback.playList(queue.tracks, queue.index, { kind: "playlist", id, name: title });
        let subtitle: string | null = null;
        if (data.source === "user") subtitle = owner;
        else if (data.source === "genre") subtitle = tc("brand");
        registerRecent.mutate({
          entity_type: "playlist",
          entity_id: data.playlist.id,
          metadata: {
            title,
            subtitle,
            thumbnail_url: cover.urls[0] ?? null,
            kind: data.source,
          },
        });
      }
    };

    const rows: DetailRow[] = list.map((track, position) => ({
      key: `${track.track_id}:${String(track.position)}`,
      element: (
        <MediaRow
          testID="playlist-track"
          size="regular"
          shape="square"
          title={track.title}
          subtitle={
            track.artists.length > 0
              ? track.artists.map((a) => a.name).join(t("artistSeparator"))
              : undefined
          }
          urls={[track.thumbnail_url]}
          onPress={() => {
            play(position);
          }}
        />
      ),
    }));

    body = {
      kind: "ready",
      title,
      cover,
      washColor: wash,
      rows,
      onEndReached: tracks.loadMore,
      children: (
        <>
          <View style={styles.info} testID="playlist-info">
            {creator !== null ? (
              <View style={styles.creator} testID="playlist-creator">
                {creator.mark === "avatar" ? (
                  <Avatar name={creator.name} size="creator" />
                ) : (
                  <View style={styles.brandMark}>
                    <Image
                      source={brandIcon}
                      style={styles.brandMarkImage}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      accessible={false}
                    />
                  </View>
                )}
                <Text variant="rowTitle" tone="secondary">
                  {creator.name}
                </Text>
              </View>
            ) : null}
            {description !== null && description !== "" ? (
              <Text tone="secondary">{description}</Text>
            ) : null}
            <Text variant="meta" tone="tertiary">
              {playlistMeta(meta, t)}
            </Text>
          </View>
          {list.length === 0 ? <EmptyState icon="music" message={t("empty")} /> : null}
        </>
      ),
    };
  }

  return (
    <DetailScreen
      testID="playlist"
      body={body}
      backLabel={t("back")}
      onBack={goBack}
      topInset={insets.top}
      bottomInset={tabBarClearance}
    />
  );
}

const styles = StyleSheet.create({
  info: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xl, gap: spacing.xs },
  creator: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandMark: {
    width: layout.creatorMark,
    height: layout.creatorMark,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkImage: { width: layout.creatorMark, height: layout.creatorMark },
});
