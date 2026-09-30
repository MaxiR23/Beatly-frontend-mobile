// INFO: a single's subtitle: its kind and its year joined, each omitted when the API sends none; undefined when it sends neither.
import type { ArtistSingle } from "@beatly/core";

import type { useT } from "../../adapters/i18n.ts";

type ArtistT = ReturnType<typeof useT<"artist">>;

export function singleMeta(single: ArtistSingle, t: ArtistT): string | undefined {
  const parts: string[] = [];
  if (single.type !== null) parts.push(t(single.type === "EP" ? "kind.ep" : "kind.single"));
  if (single.year !== null) parts.push(single.year);
  return parts.length === 0 ? undefined : parts.join(t("metaSeparator"));
}
