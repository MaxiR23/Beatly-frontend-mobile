// INFO: the up next tab of the player sheet: the rest of the queue (a press jumps inside it), then the suggestions of GET /tracks/{id}/upnext without the first track, which is the current one (a press plays the suggestions from it); the rest of the queue is local, so it is drawn while the suggestions load or fail.
import type { PlayableTrack } from "@beatly/core";
import { EmptyState, ErrorState, LoadingState, MediaRow } from "@beatly/ui/native";
import { useEffect } from "react";
import { FlatList } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useUpNext } from "../../queries/useTracks.ts";
import { playableOf } from "./queue.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

interface UpNextTabProps {
  trackId: string;
  onAtTopChange: (atTop: boolean) => void;
}

interface Row {
  key: string;
  section: "rest" | "suggestion";
  position: number;
  track: PlayableTrack;
}

export function UpNextTab({ trackId, onAtTopChange }: UpNextTabProps) {
  const t = useT("player");
  const tc = useT("common");
  const playback = usePlaybackActions();
  const queue = usePlayback((s) => s.queue);
  const index = usePlayback((s) => s.index);
  const current = usePlayback((s) => s.current);
  const upNext = useUpNext(trackId);

  useEffect(() => {
    onAtTopChange(true);
  }, [onAtTopChange]);

  const rest = queue.slice(index + 1);
  const suggestions = (upNext.data?.tracks.slice(1) ?? []).map(playableOf);
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
    } else if (current !== null) {
      void playback.playList(suggestions, row.position, {
        kind: "track",
        id: current.trackId,
        name: current.title,
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
        />
      )}
      testID="player-sheet-upnext"
    />
  );
}
