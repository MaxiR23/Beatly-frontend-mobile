// INFO: an album: the detail base with its cover, title, artists, meta line, tracks and the carousels of other versions and recommended albums; unavailable for an invalid id; starting a list registers it as a recent.
import type { AlbumRef, SearchArtistRef } from "@beatly/core";
import { layout, spacing } from "@beatly/ui";
import {
  Carousel,
  DetailScreen,
  EmptyState,
  Link,
  Text,
  TrackRow,
  type CarouselItem,
  type DetailBody,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useAlbum } from "../../queries/useAlbum.ts";
import { useRegisterRecent } from "../../queries/useRecents.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useDominantColor } from "../detail/useDominantColor.ts";
import { albumMeta } from "./albumMeta.ts";
import { toQueue } from "../player/queue.ts";
import { usePlaybackActions } from "../player/usePlayback.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";

export function AlbumScreen() {
  const t = useT("album");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const playback = usePlaybackActions();
  const registerRecent = useRegisterRecent();
  const { id = "" } = useLocalSearchParams<{ id?: string }>();
  const album = useAlbum(id);
  const wash = useDominantColor(album.data?.thumbnail_url ?? null);

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const artistNames = (artists: readonly SearchArtistRef[]) =>
    artists.map((a) => a.name).join(t("artistSeparator"));

  const toCarouselItem = (ref: AlbumRef): CarouselItem => ({
    key: ref.id,
    title: ref.title,
    subtitle: ref.artists.length > 0 ? artistNames(ref.artists) : (ref.year ?? undefined),
    urls: ref.thumbnail_url !== null ? [ref.thumbnail_url] : [],
    shape: "square",
    onPress: () => {
      router.push({ pathname: "/album/[id]", params: { id: ref.id } });
    },
  });

  const unavailable =
    album.error instanceof OutcomeError &&
    album.error.outcome.kind === "api_failure" &&
    album.error.outcome.reason === "invalid_request";

  let body: DetailBody;
  if (album.isPending) {
    body = { kind: "loading", label: tc("loading") };
  } else if (unavailable) {
    body = { kind: "unavailable", message: t("notAvailable") };
  } else if (album.isError) {
    body = {
      kind: "error",
      message: tc("error.generic"),
      retryLabel: tc("retry"),
      onRetry: () => void album.refetch(),
    };
  } else {
    const data = album.data;
    const playTrack = (tapped: number) => {
      const queue = toQueue(data.tracks, tapped, (track) =>
        track.track_id === null || !track.is_available
          ? null
          : {
              trackId: track.track_id,
              title: track.title,
              artists: track.artists.length > 0 ? track.artists : data.artists,
              // The album being played fills what the track lacks.
              album: data.title,
              albumId: data.id,
              coverUrl: data.thumbnail_url,
              durationSeconds: track.duration_seconds,
            },
      );
      if (queue !== null) {
        void playback.playList(queue.tracks, queue.index, {
          kind: "album",
          id: data.id,
          name: data.title,
        });
        registerRecent.mutate({
          entity_type: "album",
          entity_id: data.id,
          metadata: {
            title: data.title,
            subtitle: data.artists.length > 0 ? artistNames(data.artists) : null,
            thumbnail_url: data.thumbnail_url,
          },
        });
      }
    };
    body = {
      kind: "ready",
      title: data.title,
      cover: { urls: data.thumbnail_url === null ? [] : [data.thumbnail_url] },
      washColor: wash,
      children: (
        <View style={styles.sections} testID="album-sections">
          <View style={styles.info} testID="album-info">
            {data.artists.length > 0 ? (
              <Text variant="rowTitle" tone="secondary">
                {data.artists.map((artist, index) => {
                  const artistId = artist.id;
                  return (
                    <Fragment key={`${String(index)}:${artist.name}`}>
                      {index > 0 ? t("artistSeparator") : null}
                      {artistId !== null ? (
                        <Link
                          label={artist.name}
                          onPress={() => {
                            router.push({ pathname: "/artist/[id]", params: { id: artistId } });
                          }}
                        />
                      ) : (
                        artist.name
                      )}
                    </Fragment>
                  );
                })}
              </Text>
            ) : null}
            <Text variant="meta" tone="tertiary">
              {albumMeta(data, t)}
            </Text>
          </View>
          {data.tracks.length === 0 ? (
            <EmptyState icon="music" message={t("empty")} />
          ) : (
            <View>
              {data.tracks.map((track, index) => (
                <TrackRow
                  key={track.track_number}
                  number={track.track_number}
                  title={track.title}
                  subtitle={track.artists.length > 0 ? artistNames(track.artists) : undefined}
                  available={track.is_available}
                  onPress={
                    track.track_id !== null && track.is_available
                      ? () => {
                          playTrack(index);
                        }
                      : undefined
                  }
                />
              ))}
            </View>
          )}
          {data.other_versions.length > 0 ? (
            <Carousel
              testID="album-other-versions"
              title={t("otherVersions")}
              items={data.other_versions.map(toCarouselItem)}
            />
          ) : null}
          {data.related_recommendations.length > 0 ? (
            <Carousel
              testID="album-recommended"
              title={t("recommended")}
              items={data.related_recommendations.map(toCarouselItem)}
            />
          ) : null}
        </View>
      ),
    };
  }

  return (
    <DetailScreen
      testID="album"
      body={body}
      backLabel={t("back")}
      onBack={goBack}
      topInset={insets.top}
      bottomInset={tabBarClearance}
    />
  );
}

// The gap between the title block and the tracks is `sections.gap`, chosen once; `info` adds none.
const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  info: { paddingHorizontal: layout.gutter, gap: spacing.xs },
});
