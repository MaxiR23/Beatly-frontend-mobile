// INFO: the player: dragged down from its header, or from its column at the top, it closes (springs back if released early); the cover shrinks while paused; iOS has no close button, Android does; reduce motion keeps the player and the cover still; a handle at the bottom opens the up next, lyrics and related sheet, and the drag to close is off while it is open, and the system back and the accessibility escape close the sheet first, then the player; close (chevron down, Android only), the source and the track's menu button in a control-height header, then a scrolling column: the full-width cover, the title (scrolls when it does not fit) and artists with the heart beside them when the track can be liked, the seek bar and the controls row (shuffle, previous, play or pause, next, repeat one); loading spins the play button, a failure draws the error with retry in place of the controls, nothing loaded draws the empty state.
import { likeInputOf, type PlayableTrack } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Cover,
  DragToClose,
  EmptyState,
  ErrorState,
  GradientFill,
  IconButton,
  Marquee,
  PauseScale,
  SeekBar,
  Text,
} from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useDominantColor } from "../detail/useDominantColor.ts";
import { useIsLiked } from "../../queries/useLikes.ts";
import { formatDuration } from "../search/formatDuration.ts";
import { TrackMenuButton } from "../trackMenu/TrackMenuButton.tsx";
import { useTrackMenu } from "../trackMenu/trackMenuContext.ts";
import { TrackMenuHost } from "../trackMenu/TrackMenuHost.tsx";
import { PlayerSheet } from "./PlayerSheet.tsx";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";
import { useReduceMotion } from "./useReduceMotion.ts";

function PlayerTitles({ track, reduceMotion }: { track: PlayableTrack; reduceMotion: boolean }) {
  const t = useT("player");
  const tm = useT("trackMenu");
  const { toggleLike } = useTrackMenu();
  const liked = useIsLiked(track.trackId);
  return (
    <View style={styles.titleRow} testID="player-titles">
      <View style={styles.titles}>
        <Marquee text={track.title} variant="title" reduceMotion={reduceMotion} />
        <Text tone="secondary" numberOfLines={1}>
          {track.artists.map((artist) => artist.name).join(t("artistSeparator"))}
        </Text>
      </View>
      {likeInputOf(track) !== null ? (
        <IconButton
          icon="heart"
          filled={liked}
          selected={liked}
          accessibilityLabel={liked ? tm("items.unlike") : tm("items.like")}
          onPress={() => {
            void toggleLike(track);
          }}
        />
      ) : null}
    </View>
  );
}

export function PlayerScreen() {
  const t = useT("player");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const playback = usePlaybackActions();
  const state = usePlayback((s) => s);
  const { current, source, status } = state;
  const wash = useDominantColor(current?.coverUrl ?? null);
  const reduceMotion = useReduceMotion();
  const [atTop, setAtTop] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  function close() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  useEffect(() => {
    if (!sheetOpen) return;
    // With the sheet open, the system back closes the sheet first; a second back reaches the route.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setSheetOpen(false);
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [sheetOpen]);

  function openInTab(pathname: "/album/[id]" | "/artist/[id]", id: string) {
    // Closes the player first, so the detail route resolves in the current tab.
    close();
    router.push({ pathname, params: { id } });
  }

  const leading =
    Platform.OS === "ios" ? (
      <View style={styles.balance} />
    ) : (
      <IconButton icon="chevronDown" accessibilityLabel={t("close")} onPress={close} />
    );
  const top = { paddingTop: insets.top };
  const bottom = { paddingBottom: spacing.xl };

  if (current === null) {
    return (
      <DragToClose onClose={close} enabled reduceMotion={reduceMotion} testID="player-drag">
        <View style={styles.root} testID="player">
          <View style={top}>
            <View style={styles.header} testID="player-header">
              {leading}
            </View>
          </View>
          <View style={styles.state}>
            <EmptyState icon="music" message={t("empty")} />
          </View>
        </View>
      </DragToClose>
    );
  }

  const duration = state.durationSeconds;
  const coverSize = width - 2 * spacing.xl;
  const hasSeek = duration !== null && duration > 0;
  const failed = status === "failed";
  const sourceName =
    source === null
      ? ""
      : source.kind === "search"
        ? t("searchSource", { query: source.name })
        : source.kind === "track"
          ? t("trackSource", { title: source.name })
          : source.name;

  return (
    <DragToClose
      onClose={
        sheetOpen
          ? () => {
              setSheetOpen(false);
            }
          : close
      }
      enabled={atTop && !sheetOpen}
      reduceMotion={reduceMotion}
      testID="player-drag"
    >
      <TrackMenuHost
        onOpenArtist={(id) => {
          openInTab("/artist/[id]", id);
        }}
        onOpenAlbum={(id) => {
          openInTab("/album/[id]", id);
        }}
        bottomInset={insets.bottom}
      >
        <PlayerSheet
          open={sheetOpen}
          onOpen={() => {
            setSheetOpen(true);
          }}
          onClose={() => {
            setSheetOpen(false);
          }}
          reduceMotion={reduceMotion}
          wash={wash}
          onOpenAlbum={(id) => {
            openInTab("/album/[id]", id);
          }}
          onOpenArtist={(id) => {
            openInTab("/artist/[id]", id);
          }}
        >
          <View style={styles.root} testID="player">
            {wash === null ? null : (
              <View style={StyleSheet.absoluteFill} testID="player-wash">
                <GradientFill
                  direction="vertical"
                  colors={[wash, color.surface.base, color.surface.base]}
                />
              </View>
            )}
            <View style={top}>
              <View style={styles.header} testID="player-header">
                {leading}
                <View style={styles.source}>
                  <Text variant="label" tone="secondary" align="center" numberOfLines={1}>
                    {t("playingFrom")}
                  </Text>
                  <Text variant="rowTitle" align="center" numberOfLines={1}>
                    {sourceName}
                  </Text>
                </View>
                <TrackMenuButton track={current} />
              </View>
            </View>
            <ScrollView
              bounces={false}
              style={styles.scroll}
              contentContainerStyle={[styles.content, bottom]}
              onScroll={(event) => {
                setAtTop(event.nativeEvent.contentOffset.y <= 0);
              }}
              testID="player-content"
            >
              <View style={styles.cover} testID="player-cover">
                <PauseScale
                  paused={status === "paused"}
                  reduceMotion={reduceMotion}
                  testID="player-cover-scale"
                >
                  <Cover
                    urls={current.coverUrl === null ? [] : [current.coverUrl]}
                    shape="square"
                    corner="md"
                    size={coverSize}
                    elevated
                  />
                </PauseScale>
              </View>
              <PlayerTitles track={current} reduceMotion={reduceMotion} />
              {failed ? (
                <View style={styles.below}>
                  <ErrorState
                    message={t("error.unplayable")}
                    retryLabel={tc("retry")}
                    onRetry={() => {
                      void playback.retry();
                    }}
                  />
                </View>
              ) : (
                <>
                  {hasSeek ? (
                    <View style={styles.below} testID="player-seek">
                      <SeekBar
                        positionSeconds={state.positionSeconds}
                        durationSeconds={duration}
                        elapsedLabel={formatDuration(state.positionSeconds)}
                        remainingLabel={t("remaining", {
                          time: formatDuration(duration - state.positionSeconds),
                        })}
                        accessibilityLabel={t("seek")}
                        onSeek={(seconds) => {
                          void playback.seek(seconds);
                        }}
                      />
                    </View>
                  ) : null}
                  <View
                    style={[styles.controls, hasSeek ? styles.afterSeek : styles.below]}
                    testID="player-controls"
                  >
                    <IconButton
                      icon="shuffle"
                      iconSize="md"
                      accessibilityLabel={t("shuffle")}
                      selected={state.shuffle}
                      onPress={() => {
                        playback.setShuffle(!state.shuffle);
                      }}
                    />
                    <IconButton
                      icon="skipBack"
                      iconSize="xl"
                      filled
                      accessibilityLabel={t("previous")}
                      onPress={() => {
                        void playback.previous();
                      }}
                    />
                    <IconButton
                      variant="primary"
                      icon={status === "playing" ? "pause" : "play"}
                      accessibilityLabel={status === "playing" ? t("pause") : t("play")}
                      busy={status === "loading"}
                      onPress={() => {
                        void playback.toggle();
                      }}
                    />
                    <IconButton
                      icon="skipForward"
                      iconSize="xl"
                      filled
                      accessibilityLabel={t("next")}
                      onPress={() => {
                        void playback.next();
                      }}
                    />
                    <IconButton
                      icon="repeat1"
                      iconSize="md"
                      accessibilityLabel={t("repeatOne")}
                      selected={state.repeatOne}
                      onPress={() => {
                        playback.setRepeatOne(!state.repeatOne);
                      }}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </PlayerSheet>
      </TrackMenuHost>
    </DragToClose>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.base },
  header: {
    height: layout.controlHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  source: { flex: 1, alignItems: "center" },
  balance: { width: layout.controlHeight },
  state: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  cover: { marginTop: spacing.xl },
  titleRow: {
    marginTop: spacing.xxl,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.gap,
  },
  titles: { flex: 1, gap: spacing.xs },
  below: { marginTop: spacing.xl },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  afterSeek: { marginTop: spacing.lg },
});
