// INFO: the stream resolver: asks the external provider's endpoint for a track's formats and picks one per platform by bitrate; every failure is a typed value, never a throw, sending the identifier the endpoint issued and retrying once with a fresh one when it asks for a login (ADR 021).
import { z } from "zod";

import { DEFAULT_TIMEOUT_MS } from "../http/client.ts";
import type { ConfigPort } from "../ports/config.ts";
import type { HttpPort } from "../ports/http.ts";
import type { LogPort } from "../ports/log.ts";
import type { StoragePort } from "../ports/storage.ts";
import type { StreamResolution, StreamResolver } from "./playback.ts";

const streamFormatSchema = z.object({
  mimeType: z.string(),
  bitrate: z.number(),
  url: z.string().optional(),
});
const streamAnswerSchema = z.object({
  responseContext: z.object({ visitorData: z.string().optional() }).optional(),
  playabilityStatus: z.object({ status: z.string() }).optional(),
  streamingData: z.object({ adaptiveFormats: z.array(streamFormatSchema) }).optional(),
});

export type StreamPlatform = "ios" | "android";

// Containers in order of preference; the first one with a playable format wins.
export const STREAM_CONTAINERS: Readonly<Record<StreamPlatform, readonly string[]>> = {
  ios: ["audio/mp4"],
  android: ["audio/mp4", "audio/webm"],
};

// The key under which the identifier the endpoint issued is kept on the device.
export const STREAM_IDENTIFIER_KEY = "beatly-stream-identifier";

// The locale the previous app sent; the answer's language is never shown.
const STREAM_LANGUAGE = "en";
const STREAM_REGION = "US";

// The playability status of a refusal that a fresh identifier can lift.
const LOGIN_REQUIRED = "LOGIN_REQUIRED";

type StreamAnswer = z.infer<typeof streamAnswerSchema>;

export type StreamFormat = z.infer<typeof streamFormatSchema>;
export type ChosenStreamFormat = StreamFormat & { readonly url: string };

const TIMED_OUT = Symbol("timed_out");

function containerOf(mimeType: string): string {
  return (mimeType.split(";")[0] ?? "").trim().toLowerCase();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function chooseStreamFormat(
  formats: readonly StreamFormat[],
  platform: StreamPlatform,
): ChosenStreamFormat | null {
  for (const container of STREAM_CONTAINERS[platform]) {
    let best: ChosenStreamFormat | null = null;
    for (const format of formats) {
      if (containerOf(format.mimeType) !== container) continue;
      const { url } = format;
      if (url === undefined || url === "") continue;
      if (best === null || format.bitrate > best.bitrate) best = { ...format, url };
    }
    if (best !== null) return best;
  }
  return null;
}

export function createStreamResolver(deps: {
  http: HttpPort;
  config: ConfigPort;
  storage: StoragePort;
  log: LogPort;
  platform: StreamPlatform;
  timeoutMs?: number;
}): StreamResolver {
  const { http, config, storage, log, platform } = deps;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function readIdentifier(): Promise<string | null> {
    try {
      const stored = await storage.get(STREAM_IDENTIFIER_KEY);
      return stored === null || stored === "" ? null : stored;
    } catch (error) {
      // No identifier is a valid request: the endpoint issues one, and the outcome still comes from its answer.
      log.warn("stream.identifier_read", { message: errorMessage(error) });
      return null;
    }
  }

  async function keepIdentifier(sent: string | null, answer: StreamAnswer): Promise<void> {
    const issued = answer.responseContext?.visitorData;
    if (issued === undefined || issued === "" || issued === sent) return;
    try {
      await storage.set(STREAM_IDENTIFIER_KEY, issued);
    } catch (error) {
      log.warn("stream.identifier_write", { message: errorMessage(error) });
    }
  }

  async function forgetIdentifier(): Promise<void> {
    try {
      await storage.delete(STREAM_IDENTIFIER_KEY);
    } catch (error) {
      log.warn("stream.identifier_write", { message: errorMessage(error) });
    }
  }

  async function attempt(
    trackId: string,
    identifier: string | null,
  ): Promise<StreamResolution | { kind: "answer"; answer: StreamAnswer }> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<typeof TIMED_OUT>((resolveTimer) => {
      timer = setTimeout(() => {
        resolveTimer(TIMED_OUT);
        controller.abort();
      }, timeoutMs);
    });

    let response;
    try {
      const sent = http.send({
        method: "POST",
        url: config.streamEndpoint,
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          videoId: trackId,
          context: {
            client: {
              clientName: config.streamClientName,
              clientVersion: config.streamClientVersion,
              hl: STREAM_LANGUAGE,
              gl: STREAM_REGION,
              ...(identifier !== null ? { visitorData: identifier } : {}),
            },
          },
        }),
        signal: controller.signal,
      });
      // The timer must win even if the port ignores the signal.
      const raced = await Promise.race([sent, timeout]);
      if (raced === TIMED_OUT) {
        // A late rejection of the abandoned send must not surface as unhandled.
        sent.catch(() => undefined);
        log.warn("stream.timeout", { timeoutMs });
        return { kind: "failure", cause: "timeout" };
      }
      response = raced;
    } catch (error) {
      log.warn("stream.network", { message: errorMessage(error) });
      return { kind: "failure", cause: "network" };
    } finally {
      clearTimeout(timer);
    }

    if (response.status < 200 || response.status > 299) {
      log.warn("stream.status", { status: response.status });
      return { kind: "failure", cause: "unplayable", httpStatus: response.status };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(response.body);
    } catch {
      log.warn("stream.schema", { issues: "body is not JSON" });
      return { kind: "failure", cause: "invalid_response" };
    }
    const parsed = streamAnswerSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
        .join("; ");
      log.warn("stream.schema", { issues });
      return { kind: "failure", cause: "invalid_response" };
    }

    return { kind: "answer", answer: parsed.data };
  }

  function choose(answer: StreamAnswer): StreamResolution {
    const { playabilityStatus, streamingData } = answer;
    if (streamingData === undefined) {
      log.warn("stream.unplayable", { status: playabilityStatus?.status ?? null });
      return { kind: "failure", cause: "unplayable" };
    }
    const chosen = chooseStreamFormat(streamingData.adaptiveFormats, platform);
    if (chosen === null) {
      log.warn("stream.no_format", { platform, formats: streamingData.adaptiveFormats.length });
      return { kind: "failure", cause: "unplayable" };
    }
    log.debug("stream.resolved", {
      platform,
      mimeType: chosen.mimeType,
      bitrate: chosen.bitrate,
    });
    return { kind: "resolved", url: chosen.url };
  }

  async function resolve(trackId: string): Promise<StreamResolution> {
    const stored = await readIdentifier();
    const first = await attempt(trackId, stored);
    if (first.kind !== "answer") return first;
    await keepIdentifier(stored, first.answer);

    if (
      first.answer.streamingData === undefined &&
      first.answer.playabilityStatus?.status === LOGIN_REQUIRED
    ) {
      const issued = first.answer.responseContext?.visitorData;
      const fresh = issued !== undefined && issued !== "" && issued !== stored ? issued : null;
      if (fresh === null && stored !== null) await forgetIdentifier();
      log.info("stream.retry", { freshIdentifier: fresh !== null });
      const second = await attempt(trackId, fresh);
      if (second.kind !== "answer") return second;
      await keepIdentifier(fresh, second.answer);
      return choose(second.answer);
    }
    return choose(first.answer);
  }

  return { resolve };
}
