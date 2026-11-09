// INFO: the translated copy of an error cause: the title, the explanation and the retry label, from the common namespace.
import type { ErrorCause } from "@beatly/ui/native";

import { useT } from "../../adapters/i18n.ts";

export function useFailureCopy() {
  const tc = useT("common");
  return (cause: ErrorCause) => ({
    title: tc(`error.${cause}.title`),
    message: tc(`error.${cause}.body`),
    retryLabel: tc("retry"),
  });
}
