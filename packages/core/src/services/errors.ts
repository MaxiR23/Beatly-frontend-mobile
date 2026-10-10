// INFO: the errors service: reports a playback error to the API, best-effort telemetry whose data is null.
import { z } from "zod";

import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export type PlaybackErrorStage = "resolve" | "playback";

export interface PlaybackErrorReport {
  readonly track_id: string;
  readonly platform: "ios" | "android";
  readonly os_version: string;
  readonly app_version: string;
  readonly stage: PlaybackErrorStage;
  readonly error_code: string;
  readonly error_message: string;
  readonly http_status?: number;
}

export interface ErrorsService {
  reportPlayback(report: PlaybackErrorReport): Promise<HttpOutcome<null>>;
}

export function createErrorsService(client: HttpClient): ErrorsService {
  return {
    reportPlayback: (report) =>
      client.request({
        method: "POST",
        path: "/errors/playback",
        body: report,
        schema: z.null(),
      }),
  };
}
