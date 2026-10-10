// INFO: the options of an own playlist, in order: edit, edit tracks, then delete (destructive).
import type { IconName } from "@beatly/ui/native";

export type PlaylistOptionKey = "edit" | "editTracks" | "delete";

export interface PlaylistOption {
  key: PlaylistOptionKey;
  labelKey: `options.items.${PlaylistOptionKey}`;
  icon: IconName;
  destructive: boolean;
}

export const playlistOptions: readonly PlaylistOption[] = [
  { key: "edit", labelKey: "options.items.edit", icon: "pencil", destructive: false },
  {
    key: "editTracks",
    labelKey: "options.items.editTracks",
    icon: "gripVertical",
    destructive: false,
  },
  { key: "delete", labelKey: "options.items.delete", icon: "trash", destructive: true },
];
