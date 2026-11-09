// INFO: the single mapping from a failure to the cause an error state draws (offline, slow, server); queryFailure folds the flags of one or more queries into one cause or null, so a screen keeps its loading state while anything is fetching.
import type { PlaybackFailure } from "@beatly/core";
import type { ErrorCause } from "@beatly/ui/native";

import { OutcomeError } from "./outcomeError.ts";

// A TanStack query's flags as the screens read them; UseQueryResult and the shared infinite-list result both satisfy it.
interface QueryFlags {
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly isPaused: boolean;
  readonly isError: boolean;
  readonly error: unknown;
}

export function failureCauseOf(error: unknown): ErrorCause {
  if (!(error instanceof OutcomeError)) return "server";
  const outcome = error.outcome;
  if (outcome.kind === "transport_failure") {
    if (outcome.cause === "network") return "offline";
    if (outcome.cause === "timeout") return "slow";
    // schema is a body we cannot read; auth is the token read failing on the device: nothing the user's network can fix.
    return "server";
  }
  // conventions.md: upstream_timeout is "a provider did not respond in time"; every other reason is ours.
  if (outcome.kind === "api_failure" && outcome.reason === "upstream_timeout") return "slow";
  return "server";
}

export function queryFailure(...queries: readonly QueryFlags[]): ErrorCause | null {
  if (queries.some((q) => q.isPending && q.isFetching)) return null;
  const errored = queries.find((q) => q.isError);
  if (errored !== undefined) return failureCauseOf(errored.error);
  // Offline with nothing loaded: the paused fetch continues when the connection returns.
  if (queries.some((q) => q.isPending && q.isPaused)) return "offline";
  // A disabled query (pending, idle) counts neither as loading nor as failed.
  return null;
}

export function playbackFailureCause(failure: PlaybackFailure | null): ErrorCause {
  if (failure === "network") return "offline";
  if (failure === "timeout") return "slow";
  return "server";
}

// The auth port's failures carry no transport cause: offline when the device is, otherwise ours.
export function authFailureCause(online: boolean): ErrorCause {
  return online ? "server" : "offline";
}
