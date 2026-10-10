// INFO: the playback error reporter: on every failure the playback controller enters, posts one report of the track, the device, the stage and a fixed message, detached; never while signed out, values cut to the backend's limits, and a failed report is dropped with a debug log.
import type { AuthPort } from "../ports/auth.ts";
import type { LogPort } from "../ports/log.ts";
import type { ErrorsService, PlaybackErrorReport, PlaybackErrorStage } from "./errors.ts";
import type { PlaybackController, PlaybackFailure } from "./playback.ts";

export interface PlaybackDevice {
  readonly platform: "ios" | "android";
  readonly osVersion: string;
  readonly appVersion: string;
}

// The backend's limits, in code points (docs/api/errors.md).
export const PLAYBACK_ERROR_LIMITS = {
  track_id: 64,
  os_version: 32,
  app_version: 32,
  error_code: 64,
  error_message: 1000,
} as const;

// Fixed English text per error_code: never the raw error, a URL, a host or a token.
export const PLAYBACK_ERROR_MESSAGES: Readonly<Record<PlaybackFailure, string>> = {
  unplayable: "Stream resolution returned no playable stream",
  timeout: "Stream resolution timed out",
  network: "Stream resolution failed with a network error",
  invalid_response: "Stream resolution returned an invalid response",
  playback: "The audio player failed while playing the track",
};

const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

// By code points, as the backend measures: never splits a surrogate pair.
function cut(value: string, limit: number): string {
  return Array.from(value.trim()).slice(0, limit).join("");
}

export function createPlaybackErrorReporter(deps: {
  playback: Pick<PlaybackController, "getState" | "subscribe">;
  errors: Pick<ErrorsService, "reportPlayback">;
  auth: Pick<AuthPort, "getAccessToken">;
  device: PlaybackDevice;
  log: LogPort;
}): () => void {
  const { playback, errors, auth, device, log } = deps;

  const report = async (
    trackId: string,
    failure: PlaybackFailure,
    httpStatus: number | null,
  ): Promise<void> => {
    const stage: PlaybackErrorStage = failure === "playback" ? "playback" : "resolve";
    const texts = {
      track_id: cut(trackId, PLAYBACK_ERROR_LIMITS.track_id),
      os_version: cut(device.osVersion, PLAYBACK_ERROR_LIMITS.os_version),
      app_version: cut(device.appVersion, PLAYBACK_ERROR_LIMITS.app_version),
      error_code: cut(failure, PLAYBACK_ERROR_LIMITS.error_code),
      error_message: cut(PLAYBACK_ERROR_MESSAGES[failure], PLAYBACK_ERROR_LIMITS.error_message),
    };
    for (const [field, value] of Object.entries(texts)) {
      if (value === "") {
        log.debug("playback_errors.report_skipped", { field });
        return;
      }
    }
    const body: PlaybackErrorReport = {
      ...texts,
      platform: device.platform,
      stage,
      ...(httpStatus !== null &&
      Number.isInteger(httpStatus) &&
      httpStatus >= MIN_HTTP_STATUS &&
      httpStatus <= MAX_HTTP_STATUS
        ? { http_status: httpStatus }
        : {}),
    };
    let token: string | null;
    try {
      token = await auth.getAccessToken();
    } catch {
      log.debug("playback_errors.report_dropped", {
        stage,
        code: texts.error_code,
        detail: "auth",
      });
      return;
    }
    if (token === null) {
      log.debug("playback_errors.report_skipped", { reason: "signed_out" });
      return;
    }
    const outcome = await errors.reportPlayback(body);
    if (outcome.kind === "success") return;
    log.debug("playback_errors.report_dropped", {
      stage,
      code: texts.error_code,
      kind: outcome.kind,
      detail: outcome.kind === "api_failure" ? outcome.reason : outcome.cause,
    });
  };

  let previous = playback.getState().status;
  return playback.subscribe(() => {
    const state = playback.getState();
    if (
      state.status === "failed" &&
      previous !== "failed" &&
      state.current !== null &&
      state.failure !== null
    ) {
      void report(state.current.trackId, state.failure, state.failureHttpStatus);
    }
    previous = state.status;
  });
}
