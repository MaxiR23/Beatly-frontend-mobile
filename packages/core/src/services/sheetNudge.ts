// INFO: the sheet nudge service: remembers, in memory for the app's session, the tracks whose player opening already nudged the sheet handle; created once at app start, so a restart remembers none; never throws.
export interface SheetNudgeService {
  // True the first time a track is asked for, false after; marks the track.
  take(trackId: string): boolean;
}

export function createSheetNudgeService(): SheetNudgeService {
  const nudged = new Set<string>();
  return {
    take(trackId) {
      if (nudged.has(trackId)) return false;
      nudged.add(trackId);
      return true;
    },
  };
}
