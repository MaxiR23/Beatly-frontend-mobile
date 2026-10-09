// INFO: a playlist, own, liked or genre by its source param: the detail base with its cover, title, creator, description, meta line and tracks paged by infinite scroll for own and liked; a genre playlist's header and tracks come in one request; unavailable for playlist_not_found; every track has a menu button, with remove from this playlist inside an own playlist; a row under the header plays the whole list from its first track or shuffled from a random one, loading every remaining page of an own or liked playlist first (leaving the screen before they arrive cancels the start), and a genre playlist can be saved to the library; the play button pauses and resumes the playlist while it is the playback source and the current track's rows are marked; starting a list registers it as a recent; an own playlist's action row ends with an options button that opens a sheet on both platforms to edit its title and description in a sheet or delete it after a native confirmation, which goes back; a failed delete shows the error notice and playback is never touched.
import {
  genrePlaylistLibraryInputOf,
  profileName,
  type PlayableTrack,
  type PlaylistTrack,
} from "@beatly/core";
import { color, layout, motion, radius, spacing } from "@beatly/ui";
import {
  Avatar,
  DetailActions,
  DetailScreen,
  EmptyState,
  IconButton,
  MediaRow,
  Notice,
  Text,
  type DetailBody,
  type DetailRow,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import brandIcon from "../../../assets/brand-icon.png";
import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { usePlaylistHeader, usePlaylistTracks } from "../../queries/usePlaylist.ts";
import { useLibrarySaved, useSetSaved } from "../../queries/useLibrary.ts";
import { useDeletePlaylist } from "../../queries/usePlaylists.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { useRegisterRecent } from "../../queries/useRecents.ts";
import { useDominantColor } from "../detail/useDominantColor.ts";
import { EditPlaylistSheet } from "./EditPlaylistSheet.tsx";
import { PlaylistOptionsSheet } from "./PlaylistOptionsSheet.tsx";
import type { PlaylistOptionKey } from "./playlistOptions.ts";
import { playlistMeta } from "./playlistMeta.ts";
import { playlistSource } from "./playlistSource.ts";
import { toQueue, wholeQueue } from "../player/queue.ts";
import { useListPlayback, useNowPlaying } from "../player/useNowPlaying.ts";
import { usePlaybackActions } from "../player/usePlayback.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";
import { TrackMenuButton } from "../trackMenu/TrackMenuButton.tsx";
import { TrackMenuHost } from "../trackMenu/TrackMenuHost.tsx";

// The track as playback and the menu see it.
const toPlayable = (track: PlaylistTrack): PlayableTrack => ({
  trackId: track.track_id,
  title: track.title,
  artists: track.artists,
  album: track.album,
  albumId: track.album_id,
  coverUrl: track.thumbnail_url,
  durationSeconds: track.duration_seconds,
});

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
  const saved = useLibrarySaved("playlist", id, kind === "genre");
  const setSaved = useSetSaved("playlist", id);
  const nowPlaying = useNowPlaying();
  const listPlayback = useListPlayback("playlist", id);
  const [starting, setStarting] = useState<"play" | "shuffle" | null>(null);
  // Leaving the screen while the pages load cancels the start.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [sheet, setSheet] = useState<"options" | "edit" | null>(null);
  const [failed, setFailed] = useState<{ at: number } | null>(null);
  const deletion = useDeletePlaylist();
  useEffect(() => {
    if (failed === null) return;
    const timer = setTimeout(() => {
      setFailed(null);
    }, motion.duration.notice);
    return () => {
      clearTimeout(timer);
    };
  }, [failed]);
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

  // Only an own playlist has options; before its header arrives both are no-ops.
  const own = header.data?.source === "user" ? header.data.playlist : null;

  const confirmDelete = () => {
    if (own === null) return;
    Alert.alert(t("delete.title", { title: own.title }), t("delete.message"), [
      { text: t("delete.cancel"), style: "cancel" },
      {
        text: t("delete.confirm"),
        style: "destructive",
        onPress: () => {
          if (deletion.isPending) return;
          deletion.mutate(id, {
            onSuccess: goBack,
            onError: () => {
              setFailed({ at: Date.now() });
            },
          });
        },
      },
    ]);
  };

  const selectOption = (key: PlaylistOptionKey) => {
    if (key === "edit") {
      setSheet("edit");
    } else {
      setSheet(null);
      confirmDelete();
    }
  };

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

    // A mode sets the shuffle flag first, because playList reads it on entry; a row tap leaves it alone.
    const start = (
      queue: { tracks: PlayableTrack[]; index: number } | null,
      mode?: "play" | "shuffle",
    ) => {
      if (queue === null) return;
      if (mode !== undefined) playback.setShuffle(mode === "shuffle");
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
    };

    // Own and liked lists page: the whole list is loaded first. A failed page puts the query in
    // error, which draws the error body; a screen that went away starts nothing.
    const startWhole = async (mode: "play" | "shuffle") => {
      setStarting(mode);
      const whole =
        data.source === "genre"
          ? ({ kind: "loaded", items: list } as const)
          : await tracks.loadAll(() => !mounted.current);
      if (mounted.current) setStarting(null);
      if (whole.kind !== "loaded") return;
      start(wholeQueue(whole.items, toPlayable, mode === "play" ? "first" : "random"), mode);
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
            start(toQueue(list, position, toPlayable));
          }}
          nowPlaying={nowPlaying.of(track.track_id)}
          reduceMotion={nowPlaying.reduceMotion}
          trailing={<TrackMenuButton track={toPlayable(track)} />}
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
          <View style={styles.actions}>
            <DetailActions
              testID="playlist-actions"
              play={{
                state: listPlayback,
                label: t("play"),
                pauseLabel: t("pause"),
                busy: starting === "play",
                onStart: () => {
                  void startWhole("play");
                },
                onToggle: () => {
                  void playback.toggle();
                },
              }}
              reduceMotion={nowPlaying.reduceMotion}
              shuffle={{
                label: t("shuffle"),
                busy: starting === "shuffle",
                onPress: () => {
                  void startWhole("shuffle");
                },
              }}
              disabled={list.length === 0}
              {...(data.source === "user"
                ? {
                    options: (
                      <IconButton
                        icon="ellipsis"
                        accessibilityLabel={t("options.more")}
                        onPress={() => {
                          setSheet("options");
                        }}
                      />
                    ),
                  }
                : {})}
              {...(data.source === "genre"
                ? {
                    save: {
                      label: saved.data === true ? t("unsave") : t("save"),
                      saved: saved.data === true,
                      disabled: !saved.isSuccess,
                      onPress: () => {
                        if (setSaved.isPending) return;
                        setSaved.mutate({
                          saved: saved.data !== true,
                          input: genrePlaylistLibraryInputOf(
                            id,
                            data.playlist.title,
                            cover.urls[0] ?? null,
                          ),
                        });
                      },
                    },
                  }
                : {})}
            />
          </View>
          {list.length === 0 ? <EmptyState icon="music" message={t("empty")} /> : null}
        </>
      ),
    };
  }

  return (
    <TrackMenuHost
      ownPlaylistId={kind === "user" ? id : null}
      onOpenArtist={(artistId) => {
        router.push({ pathname: "/artist/[id]", params: { id: artistId } });
      }}
      onOpenAlbum={(albumId) => {
        router.push({ pathname: "/album/[id]", params: { id: albumId } });
      }}
      bottomInset={tabBarClearance}
    >
      <DetailScreen
        testID="playlist"
        body={body}
        backLabel={t("back")}
        onBack={goBack}
        topInset={insets.top}
        bottomInset={tabBarClearance}
      />
      {sheet === "options" ? (
        <PlaylistOptionsSheet
          onSelect={selectOption}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === "edit" && own !== null ? (
        <EditPlaylistSheet
          playlist={own}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {failed !== null ? (
        <View
          pointerEvents="none"
          style={[styles.notice, { bottom: tabBarClearance + spacing.md }]}
          testID="playlist-notice"
        >
          <Notice floating tone="error" message={tc("error.generic")} />
        </View>
      ) : null}
    </TrackMenuHost>
  );
}

const styles = StyleSheet.create({
  info: { paddingHorizontal: layout.gutter, paddingBottom: spacing.xl, gap: spacing.xs },
  actions: { paddingBottom: spacing.xl },
  creator: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  notice: { position: "absolute", left: layout.gutter, right: layout.gutter },
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
