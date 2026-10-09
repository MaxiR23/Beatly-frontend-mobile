// INFO: the PATCH body of the edit sheet: the trimmed title and the description (null when empty after trim), each only when it differs from the playlist's, or null when nothing changed.
import type { UpdatePlaylistInput } from "@beatly/core";

const normalDescription = (value: string | null): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

export function playlistEditPatch(
  original: { title: string; description: string | null },
  form: { title: string; description: string },
): UpdatePlaylistInput | null {
  const title = form.title.trim();
  const description = normalDescription(form.description);
  const titleChanged = title !== original.title.trim();
  const descriptionChanged = description !== normalDescription(original.description);
  if (!titleChanged && !descriptionChanged) return null;
  return {
    ...(titleChanged ? { title } : {}),
    ...(descriptionChanged ? { description } : {}),
  };
}
