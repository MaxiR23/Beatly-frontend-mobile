// INFO: an album: the detail base with its cover, title, artists, meta line, tracks and the carousels of other versions and recommended albums; unavailable for an invalid id; every playable track has a menu button; a track without a track id or marked unavailable is dimmed, unpressable, without menu, and announced as not available; a row under the header plays the whole album from its first playable track or shuffled from a random one, and saves it to the library; the play button pauses and resumes the album while it is the playback source and the current track's row is marked; starting a list registers it as a recent.
import {
  albumLibraryInputOf,
  type Album,
  type AlbumRef,
  type PlayableTrack,
  type SearchArtistRef,
} from "@beatly/core";
import { layout, spacing } from "@beatly/ui";
import {
  Carousel,
  DetailActions,
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
import { useLibrarySaved, useSetSaved } from "../../queries/useLibrary.ts";
import { useRegisterRecent } from "../../queries/useRecents.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useDominantColor } from "../detail/useDominantColor.ts";
import { albumMeta } from "./albumMeta.ts";
import { toQueue, wholeQueue } from "../player/queue.ts";
import { useListPlayback, useNowPlaying } from "../player/useNowPlaying.ts";
import { usePlaybackActions } from "../player/usePlayback.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";
import { TrackMenuButton } from "../trackMenu/TrackMenuButton.tsx";
import { TrackMenuHost } from "../trackMenu/TrackMenuHost.tsx";

type AlbumTrack = Album["tracks"][number];

// The track as playback and the menu see it: null when it cannot be played.
function toPlayable(album: Album, track: AlbumTrack): PlayableTrack | null {
  if (track.track_id === null || !track.is_available) return null;
  return {
    trackId: track.track_id,
    title: track.title,
    artists: track.artists.length > 0 ? track.artists : album.artists,
    // The album being played fills what the track lacks.
    album: album.title,
    albumId: album.id,
    coverUrl: album.thumbnail_url,
    durationSeconds: track.duration_seconds,
  };
}

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
  const saved = useLibrarySaved("album", id, true);
  const setSaved = useSetSaved("album", id);
  const nowPlaying = useNowPlaying();
  const listPlayback = useListPlayback("album", album.data?.id ?? null);
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
    const playable = (track: AlbumTrack) => toPlayable(data, track);
    // A mode sets the shuffle flag first, because playList reads it on entry; a row tap leaves it alone.
    const start = (
      queue: { tracks: PlayableTrack[]; index: number } | null,
      mode?: "play" | "shuffle",
    ) => {
      if (queue === null) return;
      if (mode !== undefined) playback.setShuffle(mode === "shuffle");
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
          <DetailActions
            testID="album-actions"
            play={{
              state: listPlayback,
              label: t("play"),
              pauseLabel: t("pause"),
              busy: false,
              onStart: () => {
                start(wholeQueue(data.tracks, playable, "first"), "play");
              },
              onToggle: () => {
                void playback.toggle();
              },
            }}
            reduceMotion={nowPlaying.reduceMotion}
            shuffle={{
              label: t("shuffle"),
              busy: false,
              onPress: () => {
                start(wholeQueue(data.tracks, playable, "random"), "shuffle");
              },
            }}
            disabled={wholeQueue(data.tracks, playable, "first") === null}
            save={{
              label: saved.data === true ? t("unsave") : t("save"),
              saved: saved.data === true,
              disabled: !saved.isSuccess,
              onPress: () => {
                if (setSaved.isPending) return;
                setSaved.mutate({
                  saved: saved.data !== true,
                  input: albumLibraryInputOf(
                    id,
                    data,
                    data.artists.length > 0 ? artistNames(data.artists) : null,
                  ),
                });
              },
            }}
          />
          {data.tracks.length === 0 ? (
            <EmptyState icon="music" message={t("empty")} />
          ) : (
            <View>
              {data.tracks.map((track, index) => {
                const playableTrack = playable(track);
                return (
                  <TrackRow
                    key={track.track_number}
                    number={track.track_number}
                    title={track.title}
                    subtitle={track.artists.length > 0 ? artistNames(track.artists) : undefined}
                    available={playableTrack !== null}
                    unavailableLabel={t("trackUnavailable", { title: track.title })}
                    nowPlaying={nowPlaying.of(playableTrack?.trackId ?? null)}
                    reduceMotion={nowPlaying.reduceMotion}
                    trailing={
                      playableTrack !== null ? <TrackMenuButton track={playableTrack} /> : undefined
                    }
                    onPress={
                      playableTrack !== null
                        ? () => {
                            start(toQueue(data.tracks, index, playable));
                          }
                        : undefined
                    }
                  />
                );
              })}
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
    <TrackMenuHost
      onOpenArtist={(artistId) => {
        router.push({ pathname: "/artist/[id]", params: { id: artistId } });
      }}
      onOpenAlbum={(albumId) => {
        router.push({ pathname: "/album/[id]", params: { id: albumId } });
      }}
      bottomInset={tabBarClearance}
    >
      <DetailScreen
        testID="album"
        body={body}
        backLabel={t("back")}
        onBack={goBack}
        topInset={insets.top}
        bottomInset={tabBarClearance}
      />
    </TrackMenuHost>
  );
}

// The gap between the title block and the tracks is `sections.gap`, chosen once; `info` adds none.
const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  info: { paddingHorizontal: layout.gutter, gap: spacing.xs },
});
