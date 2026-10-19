// INFO: mounted once while signed in, draws nothing: hands the stored autoplay setting to the playback controller, and once per source, when its suggestions are wanted (the up next tab opened or its last track started), reads the up next of the source's seed and hands its suggestions to the controller; that read stays mounted until the next source, so the cache entry lives as long as the source (the test QueryClient never collects, so no test shows it).
import type { PlayableTrack } from "@beatly/core";
import { useEffect } from "react";

import { useAutoplaySetting } from "../../queries/useAutoplay.ts";
import { useUpNext } from "../../queries/useTracks.ts";
import { suggestionsOf } from "./queue.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

export function Autoplay() {
  const playback = usePlaybackActions();
  const setting = useAutoplaySetting();
  const seed = usePlayback((s) => s.seed);
  const sourceStart = usePlayback((s) => s.sourceStart);
  const wanted = usePlayback((s) => s.suggestionsWanted);

  useEffect(() => {
    if (setting.data !== undefined) playback.setAutoplay(setting.data);
    else if (setting.isError) playback.setAutoplay(false);
  }, [playback, setting.data, setting.isError]);

  return seed === null || !wanted ? null : <SourceSuggestions key={sourceStart} seed={seed} />;
}

function SourceSuggestions({ seed }: { seed: PlayableTrack }) {
  const playback = usePlaybackActions();
  const upNext = useUpNext(seed.trackId);

  useEffect(() => {
    if (upNext.data !== undefined) {
      playback.setSuggestions(seed.trackId, suggestionsOf(upNext.data));
    }
  }, [playback, seed.trackId, upNext.data]);

  return null;
}
