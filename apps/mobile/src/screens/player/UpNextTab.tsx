// INFO: the up next tab of the player sheet: the rest of the queue (a press jumps inside it), then the suggestions of the source (the up next of the track it started on, requested once per source when this tab opens or the last track starts, and never refetched by the tab) without that first track, under the autoplay switch (a press plays the suggestions from it under a track source of that track); the rest of the queue is local, so it is drawn while the suggestions load or fail; every row ends with the track menu button; a row of the current track (a later repeat in the rest of the queue) is marked.
import type { PlayableTrack } from "@beatly/core";
import { EmptyState, ErrorState, LoadingState, MediaRow } from "@beatly/ui/native";
import { useEffect } from "react";
import { FlatList } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useUpNext } from "../../queries/useTracks.ts";
import { TrackMenuButton } from "../trackMenu/TrackMenuButton.tsx";
import { AutoplaySwitch } from "./AutoplaySwitch.tsx";
import { suggestionsOf } from "./queue.ts";
import { useNowPlaying } from "./useNowPlaying.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

interface UpNextTabProps {
  seed: PlayableTrack;
  onAtTopChange: (atTop: boolean) => void;
}

interface Row {
  key: string;
  section: "rest" | "suggestion";
  position: number;
  track: PlayableTrack;
}

export function UpNextTab({ seed, onAtTopChange }: UpNextTabProps) {
  const t = useT("player");
  const tc = useT("common");
  const playback = usePlaybackActions();
  const nowPlaying = useNowPlaying();
  const queue = usePlayback((s) => s.queue);
  const index = usePlayback((s) => s.index);
  const sourceStart = usePlayback((s) => s.sourceStart);
  const upNext = useUpNext(seed.trackId, { refetchOnMount: false });

  // The tab open is one of the two moments the source's suggestions are requested; a new source while it stays open asks again.
  useEffect(() => {
    playback.wantSuggestions();
  }, [playback, sourceStart]);

  useEffect(() => {
    onAtTopChange(true);
  }, [onAtTopChange]);

  const rest = queue.slice(index + 1);
  const suggestions = upNext.data === undefined ? [] : suggestionsOf(upNext.data);
  const rows: Row[] = [
    ...rest.map((track, position): Row => ({
      key: `rest:${String(position)}:${track.trackId}`,
      section: "rest",
      position,
      track,
    })),
    ...suggestions.map((track, position): Row => ({
      key: `suggestion:${String(position)}:${track.trackId}`,
      section: "suggestion",
      position,
      track,
    })),
  ];

  function press(row: Row) {
    if (row.section === "rest") {
      void playback.skipTo(index + 1 + row.position);
    } else {
      void playback.playList(suggestions, row.position, {
        kind: "track",
        id: seed.trackId,
        name: seed.title,
      });
    }
  }

  let footer = null;
  if (upNext.isPending) {
    footer = <LoadingState label={tc("loading")} />;
  } else if (upNext.isError) {
    footer = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void upNext.refetch()}
      />
    );
  } else if (rows.length === 0) {
    footer = <EmptyState icon="music" message={t("sheet.upNextEmpty")} />;
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      onScroll={(event) => {
        onAtTopChange(event.nativeEvent.contentOffset.y <= 0);
      }}
      ListHeaderComponent={<AutoplaySwitch />}
      ListFooterComponent={footer}
      renderItem={({ item }) => (
        <MediaRow
          shape="square"
          urls={item.track.coverUrl === null ? [] : [item.track.coverUrl]}
          title={item.track.title}
          subtitle={item.track.artists.map((artist) => artist.name).join(t("artistSeparator"))}
          onPress={() => {
            press(item);
          }}
          nowPlaying={nowPlaying.of(item.track.trackId)}
          reduceMotion={nowPlaying.reduceMotion}
          trailing={<TrackMenuButton track={item.track} />}
        />
      )}
      testID="player-sheet-upnext"
    />
  );
}
