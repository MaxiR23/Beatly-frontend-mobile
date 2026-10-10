// packages/core/test/services/playbackErrors.test.ts
//
// Tests for the playback error reporter.
//
// Tested:
// - reports a resolution failure (stage resolve, its cause as code) and a player failure (stage playback)
// - sends the http status only for an unplayable non-2xx answer, and only when in 100-599
// - never puts a URL, a host, a token or the raw player error in the body
// - leaves playback unchanged when the report fails (api failure, transport failure, pending)
// - sends nothing while signed out or when the token cannot be read
// - cuts every text to the backend's limits by code points; skips an empty text
// - reports once per failure entered, never a stale resolution; stops after the unsubscribe
//
// What is covered:
// - with data, the typed outcomes of the report dropped with a debug log, the controller left untouched
// - Not applicable: expected empty, the reporter reads no list
//
// Run with: pnpm --filter @beatly/core test -- playbackErrors
//
// SEE: packages/core/src/services/playbackErrors.ts

import { describe, expect, it } from "vitest";

import { createHttpClient } from "../../src/http/client.ts";
import type { AuthPort } from "../../src/ports/auth.ts";
import { createErrorsService } from "../../src/services/errors.ts";
import type { PlayableTrack, PlaybackSource } from "../../src/services/playback.ts";
import { createPlaybackController } from "../../src/services/playback.ts";
import {
  PLAYBACK_ERROR_LIMITS,
  PLAYBACK_ERROR_MESSAGES,
  createPlaybackErrorReporter,
  type PlaybackDevice,
} from "../../src/services/playbackErrors.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakePlayer } from "../fakes/player.ts";
import { createFakeStreams } from "../fakes/streams.ts";

const BASE_URL = "test://api";
const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  albumId: "a1",
  coverUrl: null,
  durationSeconds: 200,
});
const list = ["t1", "t2"].map(track);
const source: PlaybackSource = { kind: "album", id: "a1", name: "Album" };
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const device: PlaybackDevice = { platform: "ios", osVersion: "18.0", appVersion: "0.6.0" };
const ok: Handler = () => ({ body: { ok: true, data: null } });

function setup(
  options: {
    handler?: Handler;
    auth?: AuthPort;
    device?: PlaybackDevice;
    list?: readonly PlayableTrack[];
  } = {},
) {
  const player = createFakePlayer();
  const streams = createFakeStreams();
  const log = createFakeLog();
  const auth = options.auth ?? createFakeAuth().port;
  const http = createFakeHttp({ "POST /errors/playback": options.handler ?? ok }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  const controller = createPlaybackController({
    player: player.port,
    streams: streams.resolver,
    log: createFakeLog().port,
  });
  const off = createPlaybackErrorReporter({
    playback: controller,
    errors: createErrorsService(client),
    auth,
    device: options.device ?? device,
    log: log.port,
  });
  const start = () => controller.playList(options.list ?? list, 0, source);
  return { controller, player, streams, log, http, off, start };
}

const bodies = (http: { requests: { body?: string }[] }): Record<string, unknown>[] =>
  http.requests.map((r) => JSON.parse(r.body ?? "null") as Record<string, unknown>);

describe("reporting", () => {
  it.each(["unplayable", "timeout", "network", "invalid_response"] as const)(
    "reports a %s resolution failure with stage resolve and its cause as code",
    async (cause) => {
      const { streams, http, start } = setup();
      streams.answer("t1", { kind: "failure", cause });
      await start();
      await flush();
      expect(bodies(http)).toEqual([
        {
          track_id: "t1",
          platform: "ios",
          os_version: "18.0",
          app_version: "0.6.0",
          stage: "resolve",
          error_code: cause,
          error_message: PLAYBACK_ERROR_MESSAGES[cause],
        },
      ]);
    },
  );

  it("reports a player failure with stage playback and code playback", async () => {
    const { player, http, start } = setup();
    await start();
    player.emit({ type: "error", message: "failed https://stream.test/x?token=abc" });
    await flush();
    expect(bodies(http)).toEqual([
      {
        track_id: "t1",
        platform: "ios",
        os_version: "18.0",
        app_version: "0.6.0",
        stage: "playback",
        error_code: "playback",
        error_message: PLAYBACK_ERROR_MESSAGES.playback,
      },
    ]);
  });

  it("sends the http status only for an unplayable non-2xx answer", async () => {
    const { streams, http, start } = setup();
    streams.answer("t1", { kind: "failure", cause: "unplayable", httpStatus: 403 });
    await start();
    await flush();
    expect(bodies(http)[0]).toMatchObject({ error_code: "unplayable", http_status: 403 });
  });

  it.each([0, 600, 403.5])("omits an http status of %s", async (httpStatus) => {
    const { streams, http, start } = setup();
    streams.answer("t1", { kind: "failure", cause: "unplayable", httpStatus });
    await start();
    await flush();
    expect(bodies(http)).toHaveLength(1);
    expect(bodies(http)[0]).not.toHaveProperty("http_status");
  });

  it("never puts a URL, a host, a token or the raw error in the body", async () => {
    const { streams, player, http, start, controller } = setup();
    streams.answer("t1", { kind: "failure", cause: "unplayable", httpStatus: 403 });
    await start();
    streams.answer("t1", { kind: "resolved", url: "test://stream.test/audio?token=abc" });
    await controller.retry();
    player.emit({ type: "error", message: "failed https://stream.test/x?token=abc" });
    await flush();
    expect(http.requests).toHaveLength(2);
    for (const request of http.requests) {
      const raw = request.body ?? "";
      expect(raw).not.toContain("://");
      expect(raw).not.toContain("stream.test");
      expect(raw).not.toContain("token");
      expect(raw).not.toContain("failed https");
    }
  });

  it("reports once per failure entered", async () => {
    const { streams, player, http, controller, start } = setup();
    await start();
    player.emit({ type: "error", message: "a" });
    player.emit({ type: "error", message: "b" });
    await flush();
    expect(http.requests).toHaveLength(1);
    streams.answer("t1", { kind: "failure", cause: "network" });
    await controller.retry();
    await flush();
    expect(http.requests).toHaveLength(2);
  });

  it("sends nothing for a stale resolution", async () => {
    const { streams, http, controller, start } = setup();
    const settle = streams.hold("t1");
    const first = start();
    await controller.next();
    settle({ kind: "failure", cause: "timeout" });
    await first;
    await flush();
    expect(http.requests).toHaveLength(0);
  });

  it("stops reporting after the returned unsubscribe", async () => {
    const { streams, http, off, start } = setup();
    off();
    streams.answer("t1", { kind: "failure", cause: "timeout" });
    await start();
    await flush();
    expect(http.requests).toHaveLength(0);
  });
});

describe("a failed report", () => {
  const answers: [string, Handler, string][] = [
    [
      "rate_limited",
      () => ({ status: 429, body: { ok: false, reason: "rate_limited" } }),
      "rate_limited",
    ],
    [
      "invalid_request",
      () => ({ status: 422, body: { ok: false, reason: "invalid_request" } }),
      "invalid_request",
    ],
    [
      "unauthorized",
      () => ({ status: 401, body: { ok: false, reason: "unauthorized" } }),
      "unauthorized",
    ],
    [
      "upstream_error",
      () => ({ status: 502, body: { ok: false, reason: "upstream_error" } }),
      "upstream_error",
    ],
    [
      "upstream_timeout",
      () => ({ status: 504, body: { ok: false, reason: "upstream_timeout" } }),
      "upstream_timeout",
    ],
    ["network", () => Promise.reject(new Error("offline")), "network"],
  ];

  async function scenario(handler: Handler) {
    const s = setup({ handler });
    s.streams.answer("t1", { kind: "failure", cause: "timeout" });
    await s.start();
    await flush();
    s.streams.answer("t1", { kind: "resolved", url: "test://audio/t1" });
    await s.controller.retry();
    await flush();
    return s;
  }

  it.each(answers)(
    "changes nothing in playback on %s and is dropped with a debug log",
    async (_name, handler, detail) => {
      const reference = await scenario(ok);
      const run = await scenario(handler);
      expect(run.controller.getState()).toEqual(reference.controller.getState());
      expect(run.player.calls).toEqual(reference.player.calls);
      expect(run.http.requests).toHaveLength(1);
      expect(run.log.entries).toHaveLength(1);
      expect(run.log.entries[0]).toMatchObject({
        level: "debug",
        message: "playback_errors.report_dropped",
        fields: { stage: "resolve", code: "timeout", detail },
      });
    },
  );

  it("changes nothing in playback while the report is pending", async () => {
    const reference = await scenario(ok);
    const run = await scenario(never);
    expect(run.controller.getState()).toEqual(reference.controller.getState());
    expect(run.player.calls).toEqual(reference.player.calls);
    expect(run.http.requests).toHaveLength(1);
  });
});

describe("signed out", () => {
  it("sends nothing and logs a debug entry", async () => {
    const { streams, http, log, start } = setup({ auth: createFakeAuth(null).port });
    streams.answer("t1", { kind: "failure", cause: "timeout" });
    await start();
    await flush();
    expect(http.requests).toHaveLength(0);
    expect(log.entries).toEqual([
      {
        level: "debug",
        message: "playback_errors.report_skipped",
        fields: { reason: "signed_out" },
      },
    ]);
  });

  it("drops the report when the token cannot be read", async () => {
    const auth: AuthPort = {
      ...createFakeAuth().port,
      getAccessToken: () => Promise.reject(new Error("storage")),
    };
    const { streams, http, log, controller, start } = setup({ auth });
    streams.answer("t1", { kind: "failure", cause: "timeout" });
    await start();
    await flush();
    expect(http.requests).toHaveLength(0);
    expect(log.entries[0]).toMatchObject({
      level: "debug",
      message: "playback_errors.report_dropped",
    });
    expect(controller.getState().status).toBe("failed");
  });
});

describe("limits", () => {
  it("cuts every text to the backend's limits after trimming", async () => {
    const { streams, http, start } = setup({
      device: {
        platform: "android",
        osVersion: `  ${"9".repeat(40)}  `,
        appVersion: "v".repeat(50),
      },
      list: [track("x".repeat(100))],
    });
    streams.answer("x".repeat(100), { kind: "failure", cause: "timeout" });
    await start();
    await flush();
    const body = bodies(http)[0];
    expect(body?.track_id).toBe("x".repeat(64));
    expect(body?.os_version).toBe("9".repeat(32));
    expect(body?.app_version).toBe("v".repeat(32));
  });

  it("cuts by code points, not by halves of a pair", async () => {
    const id = "😀".repeat(100);
    const { streams, http, start } = setup({ list: [track(id)] });
    streams.answer(id, { kind: "failure", cause: "timeout" });
    await start();
    await flush();
    expect(bodies(http)[0]?.track_id).toBe("😀".repeat(64));
  });

  it("keeps the fixed texts within the limits", () => {
    for (const [code, message] of Object.entries(PLAYBACK_ERROR_MESSAGES)) {
      expect(Array.from(code).length).toBeLessThanOrEqual(PLAYBACK_ERROR_LIMITS.error_code);
      expect(Array.from(message).length).toBeLessThanOrEqual(PLAYBACK_ERROR_LIMITS.error_message);
    }
  });

  it("skips a report whose required text is empty after trimming", async () => {
    const { streams, http, log, start } = setup({
      device: { platform: "ios", osVersion: "   ", appVersion: "0.6.0" },
    });
    streams.answer("t1", { kind: "failure", cause: "timeout" });
    await start();
    await flush();
    expect(http.requests).toHaveLength(0);
    expect(log.entries).toEqual([
      {
        level: "debug",
        message: "playback_errors.report_skipped",
        fields: { field: "os_version" },
      },
    ]);
  });
});
