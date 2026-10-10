// INFO: the edit mode of an own playlist's tracks: it loads every page first, then draws the list with a drag handle and a remove control per row (the system list on iOS where the native module exists, the dragging list elsewhere); each gesture redraws the list at once and goes to core's sequencer, one request at a time in order; a failed request shows the error notice and reloads the server order; Done waits for the queue before going back, back leaves at once; loading, error with retry, playlist not found and an empty playlist are drawn; playback is never touched.
import type { PlaylistTrack, TrackEditResult } from "@beatly/core";
import { color, layout, motion, spacing } from "@beatly/ui";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  NativeEditList,
  Notice,
  ReorderList,
  Text,
  isNativeEditListAvailable,
  type EditListItem,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { usePlaylistTracks } from "../../queries/usePlaylist.ts";
import { usePlaylistTrackEditor } from "../../queries/usePlaylists.ts";
import { useReduceMotion } from "../player/useReduceMotion.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";
import { movedItems, withoutIndex } from "./editTracks.ts";

function isNotFound(error: unknown): boolean {
  return (
    error instanceof OutcomeError &&
    error.outcome.kind === "api_failure" &&
    error.outcome.reason === "playlist_not_found"
  );
}

export function EditTracksScreen() {
  const t = useT("playlist");
  const tc = useT("common");
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const safeAreaBottom = useSafeAreaInsets().bottom;
  const reduceMotion = useReduceMotion();
  const { id = "" } = useLocalSearchParams<{ id?: string }>();
  const tracks = usePlaylistTracks("user", id);
  const editor = usePlaylistTrackEditor(id);
  // The optimistic copy of the whole list; null while it loads or reloads.
  const [items, setItems] = useState<PlaylistTrack[] | null>(null);
  const [reloading, setReloading] = useState(false);
  const [failed, setFailed] = useState<{ at: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const mounted = useRef(true);
  const loading = useRef(false);
  // Set by a failed edit until the server order is back; Done does not leave meanwhile.
  const failure = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (failed === null) return;
    const timer = setTimeout(() => {
      setFailed(null);
    }, motion.duration.notice);
    return () => {
      clearTimeout(timer);
    };
  }, [failed]);

  // Waiting for the refetch to end lets the cached pages of the playlist screen refresh first, so the edit starts from the server's current order.
  useEffect(() => {
    if (items !== null || reloading || loading.current) return;
    if (!tracks.isSuccess || tracks.isFetching) return;
    loading.current = true;
    void tracks
      .loadAll(() => !mounted.current)
      .then((whole) => {
        loading.current = false;
        if (whole.kind === "loaded" && mounted.current) setItems(whole.items);
      });
  }, [items, reloading, tracks]);

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const onResult = (result: TrackEditResult) => {
    if (result.kind !== "failed" || !mounted.current) return;
    failure.current = true;
    setFailed({ at: Date.now() });
    setItems(null);
    setReloading(true);
    void editor.reload().then(() => {
      failure.current = false;
      if (mounted.current) setReloading(false);
    });
  };

  const onMove = (from: number, to: number) => {
    setItems((current) => (current === null ? current : movedItems(current, from, to)));
    void editor.move(from, to).then(onResult);
  };

  const onRemove = (index: number) => {
    const track = items?.[index];
    if (track === undefined) return;
    setItems((current) => (current === null ? current : withoutIndex(current, index)));
    void editor.remove(track.track_id).then(onResult);
  };

  const done = async () => {
    setFinishing(true);
    await editor.idle();
    if (!mounted.current) return;
    setFinishing(false);
    if (!failure.current) goBack();
  };

  let body;
  if (isNotFound(tracks.error)) {
    body = <EmptyState icon="music" message={t("notFound")} />;
  } else if (tracks.isError) {
    body = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => {
          void tracks.refetch();
        }}
      />
    );
  } else if (items === null) {
    body = <LoadingState label={tc("loading")} />;
  } else if (items.length === 0) {
    body = <EmptyState icon="music" message={t("empty")} />;
  } else {
    const rows: EditListItem[] = items.map((track, index) => {
      const subtitle =
        track.artists.length > 0
          ? track.artists.map((artist) => artist.name).join(t("artistSeparator"))
          : undefined;
      return {
        key: `${track.track_id}:${String(track.position)}`,
        title: track.title,
        subtitle,
        urls: [track.thumbnail_url],
        label:
          subtitle !== undefined
            ? t("editTracks.row", { title: track.title, artists: subtitle })
            : track.title,
        positionLabel: t("editTracks.position", { position: index + 1, total: items.length }),
        removeLabel: t("editTracks.remove", { title: track.title }),
        moveLabel: t("editTracks.move", { title: track.title }),
      };
    });
    body = isNativeEditListAvailable() ? (
      <NativeEditList
        items={rows}
        onMove={onMove}
        onRemove={onRemove}
        moveHint={t("editTracks.moveHint")}
        // SwiftUI's List already insets its content by the bottom safe area, so the spacer row only adds the rest of the clearance.
        bottomInset={Math.max(0, tabBarClearance - safeAreaBottom)}
      />
    ) : (
      <ReorderList
        items={rows}
        onMove={onMove}
        onRemove={onRemove}
        moveUpLabel={t("editTracks.moveUp")}
        moveDownLabel={t("editTracks.moveDown")}
        moveHint={t("editTracks.moveHint")}
        reduceMotion={reduceMotion}
        bottomInset={tabBarClearance}
      />
    );
  }

  return (
    <SafeAreaView testID="edit-tracks" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" accessibilityLabel={t("back")} onPress={goBack} />
        <View style={styles.title}>
          <Text variant="title">{t("editTracks.title")}</Text>
        </View>
        <Button
          variant="ghost"
          label={t("editTracks.done")}
          loading={finishing}
          disabled={items === null}
          onPress={() => {
            void done();
          }}
        />
      </View>
      {body}
      {failed !== null ? (
        <View
          pointerEvents="none"
          style={[styles.notice, { bottom: tabBarClearance + spacing.md }]}
          testID="edit-tracks-notice"
        >
          <Notice floating tone="error" message={tc("error.generic")} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  title: { flex: 1 },
  notice: { position: "absolute", left: layout.gutter, right: layout.gutter },
});
