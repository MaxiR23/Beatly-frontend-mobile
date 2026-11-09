// INFO: the error state every screen draws: a cause (offline, slow, server) and a retry, with the copy from i18n; the only importer of the ui ErrorState in the app. A message replaces the cause's explanation when the screen's retry does not load by itself.
import { ErrorState, type ErrorCause } from "@beatly/ui/native";

import { useFailureCopy } from "./useFailureCopy.ts";

interface FailureStateProps {
  readonly cause: ErrorCause;
  readonly message?: string | undefined;
  readonly onRetry: () => void;
}

export function FailureState({ cause, message, onRetry }: FailureStateProps) {
  const copy = useFailureCopy();
  return (
    <ErrorState
      cause={cause}
      {...copy(cause)}
      {...(message !== undefined ? { message } : {})}
      onRetry={onRetry}
    />
  );
}
