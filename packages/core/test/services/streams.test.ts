// packages/core/test/services/streams.test.ts
//
// Tests for the stream resolver and the format choice.
//
// Tested:
// - createStreamResolver over a fake http port, a config literal, a fake storage and a fake log
// - chooseStreamFormat per platform
//
// What is covered:
// - with data, the typed unplayable failure where the contract has an empty (no stream data, no format for the platform), an error status, timeout, network, a body that is not JSON and a body that fails the schema
// - the locale fields; the stored identifier sent on every request and the one the endpoint returns kept; one login-required retry with a fresh identifier or none, never a second; a store that cannot be read or written
// - the per-platform container table, the bitrate choice and fallback, never by response order or format number
// - Not applicable: ok:false reasons and the cursor case, because the endpoint is not the Beatly API and is not paginated
//
// Run with: pnpm --filter @beatly/core test -- streams
//
// SEE: packages/core/src/services/streams.ts

import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  chooseStreamFormat,
  createStreamResolver,
  STREAM_IDENTIFIER_KEY,
  type StreamFormat,
  type StreamPlatform,
} from "../../src/services/streams.ts";
import { createFakeConfig } from "../fakes/config.ts";
import { createFakeHttp, never, type FakeResponse, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakeStorage } from "../fakes/storage.ts";

const mp4Low: StreamFormat = {
  mimeType: 'audio/mp4; codecs="x"',
  bitrate: 48000,
  url: "test://audio/mp4-low",
};
const mp4High: StreamFormat = {
  mimeType: 'audio/mp4; codecs="x"',
  bitrate: 128000,
  url: "test://audio/mp4-high",
};
const webmHigh: StreamFormat = {
  mimeType: 'audio/webm; codecs="y"',
  bitrate: 160000,
  url: "test://audio/webm-high",
};
const webmLow: StreamFormat = {
  mimeType: 'audio/webm; codecs="y"',
  bitrate: 50000,
  url: "test://audio/webm-low",
};
const video: StreamFormat = {
  mimeType: 'video/mp4; codecs="z"',
  bitrate: 900000,
  url: "test://video/mp4",
};

function answer(formats: readonly StreamFormat[]): FakeResponse {
  return {
    body: { playabilityStatus: { status: "ok" }, streamingData: { adaptiveFormats: formats } },
  };
}

function refusal(visitorData?: string): FakeResponse {
  return {
    body: {
      playabilityStatus: { status: "LOGIN_REQUIRED" },
      ...(visitorData !== undefined ? { responseContext: { visitorData } } : {}),
    },
  };
}

function answerWithId(formats: readonly StreamFormat[], visitorData: string): FakeResponse {
  return {
    body: {
      playabilityStatus: { status: "ok" },
      responseContext: { visitorData },
      streamingData: { adaptiveFormats: formats },
    },
  };
}

// The next response per call; the last one repeats.
function inTurn(...responses: FakeResponse[]): Handler {
  let i = 0;
  return () => {
    const response = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (response === undefined) throw new Error("inTurn needs a response");
    return response;
  };
}

function sentClient(http: { requests: readonly { body?: string }[] }, i: number): unknown {
  const body: unknown = JSON.parse(http.requests[i]?.body ?? "null");
  return z.object({ context: z.object({ client: z.unknown() }) }).parse(body).context.client;
}

function setup(
  handler: Handler,
  options: { platform?: StreamPlatform; timeoutMs?: number; stored?: string } = {},
) {
  const http = createFakeHttp({ "POST /resolve": handler }, "test://stream");
  const log = createFakeLog();
  const storage = createFakeStorage(
    options.stored !== undefined ? { [STREAM_IDENTIFIER_KEY]: options.stored } : {},
  );
  const resolver = createStreamResolver({
    http: http.port,
    config: createFakeConfig(),
    storage: storage.port,
    log: log.port,
    platform: options.platform ?? "ios",
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });
  return { http, log, resolver, storage };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createStreamResolver", () => {
  it("resolves the url of the chosen format", async () => {
    const { resolver } = setup(() => answer([mp4Low, mp4High, webmHigh]));
    expect(await resolver.resolve("t1")).toEqual({
      kind: "resolved",
      url: "test://audio/mp4-high",
    });
  });

  it("posts the track id and the configured client to the configured endpoint without the session token", async () => {
    const { http, resolver } = setup(() => answer([mp4High]));
    await resolver.resolve("t1");
    const request = http.requests[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("test://stream/resolve");
    expect(JSON.parse(request?.body ?? "null")).toEqual({
      videoId: "t1",
      context: {
        client: { clientName: "test-client", clientVersion: "0.0-test", hl: "en", gl: "US" },
      },
    });
    expect(request?.headers["content-type"]).toBe("application/json");
    expect(request?.headers.authorization).toBeUndefined();
  });

  it("fails as unplayable when the answer carries no stream data", async () => {
    const { http, log, resolver } = setup(() => ({
      body: { playabilityStatus: { status: "unavailable" } },
    }));
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "unplayable" });
    expect(http.requests.length).toBe(1);
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "stream.unplayable",
      fields: { status: "unavailable" },
    });
  });

  it("fails as unplayable when no format suits the platform", async () => {
    const { log, resolver } = setup(() => answer([webmHigh]), { platform: "ios" });
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "unplayable" });
    expect(log.entries.some((e) => e.level === "warn" && e.message === "stream.no_format")).toBe(
      true,
    );
  });

  it("fails as unplayable when the endpoint answers an error status", async () => {
    const { log, resolver } = setup(() => ({ status: 403, body: {} }));
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "unplayable" });
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "stream.status",
      fields: { status: 403 },
    });
  });

  it("fails with a timeout when the endpoint does not answer", async () => {
    vi.useFakeTimers();
    const { http, log, resolver } = setup(() => never(), { timeoutMs: 1000 });
    const pending = resolver.resolve("t1");
    await vi.advanceTimersByTimeAsync(1001);
    expect(await pending).toEqual({ kind: "failure", cause: "timeout" });
    expect(http.requests[0]?.signal.aborted).toBe(true);
    expect(log.entries.some((e) => e.message === "stream.timeout")).toBe(true);
  });

  it("fails with network when the port rejects", async () => {
    const http = createFakeHttp({}, "test://stream");
    const log = createFakeLog();
    const resolver = createStreamResolver({
      http: http.port,
      config: createFakeConfig(),
      storage: createFakeStorage().port,
      log: log.port,
      platform: "ios",
    });
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "network" });
    expect(log.entries.some((e) => e.message === "stream.network")).toBe(true);
  });

  it("fails with invalid_response when the body is not JSON", async () => {
    const { resolver } = setup(() => ({ body: "not json" }));
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "invalid_response" });
  });

  it("fails with invalid_response when the body fails the schema", async () => {
    const { resolver } = setup(() => ({
      body: { streamingData: { adaptiveFormats: [{ mimeType: 5, bitrate: 1 }] } },
    }));
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "invalid_response" });
  });

  it("never writes the stream url or the identifier to the log", async () => {
    const { log, resolver } = setup(() => answerWithId([mp4High], "test-id-issued"), {
      stored: "test-id-stored",
    });
    await resolver.resolve("t1");
    expect(log.entries.length).toBeGreaterThan(0);
    const logged = JSON.stringify(log.entries);
    expect(logged).not.toContain("test://audio");
    expect(logged).not.toContain("test-id");
  });

  it("sends the stored identifier on every request", async () => {
    const { http, resolver } = setup(() => answer([mp4High]), { stored: "test-id-stored" });
    await resolver.resolve("t1");
    await resolver.resolve("t2");
    expect(sentClient(http, 0)).toMatchObject({ visitorData: "test-id-stored" });
    expect(sentClient(http, 1)).toMatchObject({ visitorData: "test-id-stored" });
  });

  it("keeps the identifier the endpoint returns and sends it on the next request", async () => {
    const { http, resolver, storage } = setup(() => answerWithId([mp4High], "test-id-issued"));
    await resolver.resolve("t1");
    expect(storage.values.get(STREAM_IDENTIFIER_KEY)).toBe("test-id-issued");
    await resolver.resolve("t2");
    expect(sentClient(http, 0)).not.toHaveProperty("visitorData");
    expect(sentClient(http, 1)).toMatchObject({ visitorData: "test-id-issued" });
  });

  it("resolves without an identifier when the store cannot be read", async () => {
    const { http, log, resolver, storage } = setup(() => answer([mp4High]), {
      stored: "test-id-stored",
    });
    storage.fail("get");
    expect(await resolver.resolve("t1")).toEqual({
      kind: "resolved",
      url: "test://audio/mp4-high",
    });
    expect(sentClient(http, 0)).not.toHaveProperty("visitorData");
    expect(
      log.entries.some((e) => e.level === "warn" && e.message === "stream.identifier_read"),
    ).toBe(true);
  });

  it("still resolves when the store cannot be written", async () => {
    const { log, resolver, storage } = setup(() => answerWithId([mp4High], "test-id-issued"));
    storage.fail("set");
    expect(await resolver.resolve("t1")).toEqual({
      kind: "resolved",
      url: "test://audio/mp4-high",
    });
    expect(
      log.entries.some((e) => e.level === "warn" && e.message === "stream.identifier_write"),
    ).toBe(true);
  });

  it("retries once with the fresh identifier a login-required answer carries", async () => {
    const { http, log, resolver, storage } = setup(
      inTurn(refusal("test-id-fresh"), answer([mp4High])),
      { stored: "test-id-stale" },
    );
    expect(await resolver.resolve("t1")).toEqual({
      kind: "resolved",
      url: "test://audio/mp4-high",
    });
    expect(http.requests.length).toBe(2);
    expect(sentClient(http, 0)).toMatchObject({ visitorData: "test-id-stale" });
    expect(sentClient(http, 1)).toMatchObject({ visitorData: "test-id-fresh" });
    expect(storage.values.get(STREAM_IDENTIFIER_KEY)).toBe("test-id-fresh");
    expect(log.entries).toContainEqual({
      level: "info",
      message: "stream.retry",
      fields: { freshIdentifier: true },
    });
  });

  it.each([
    ["none", refusal()],
    ["the same one", refusal("test-id-stale")],
  ])("retries once without an identifier when the refusal carries %s", async (_name, refused) => {
    const { http, resolver, storage } = setup(
      inTurn(refused, answerWithId([mp4High], "test-id-fresh")),
      { stored: "test-id-stale" },
    );
    expect(await resolver.resolve("t1")).toEqual({
      kind: "resolved",
      url: "test://audio/mp4-high",
    });
    expect(http.requests.length).toBe(2);
    expect(sentClient(http, 1)).not.toHaveProperty("visitorData");
    expect(storage.values.get(STREAM_IDENTIFIER_KEY)).toBe("test-id-fresh");
  });

  it("fails as unplayable after a second login-required answer, without a third request", async () => {
    const { http, log, resolver } = setup(inTurn(refusal("test-id-fresh")));
    expect(await resolver.resolve("t1")).toEqual({ kind: "failure", cause: "unplayable" });
    expect(http.requests.length).toBe(2);
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "stream.unplayable",
      fields: { status: "LOGIN_REQUIRED" },
    });
  });

  it("plays a login-required answer that still carries stream data, without retrying", async () => {
    const { http, resolver } = setup(() => ({
      body: {
        playabilityStatus: { status: "LOGIN_REQUIRED" },
        streamingData: { adaptiveFormats: [mp4High] },
      },
    }));
    expect(await resolver.resolve("t1")).toEqual({
      kind: "resolved",
      url: "test://audio/mp4-high",
    });
    expect(http.requests.length).toBe(1);
  });

  it("applies the timeout to the retry too", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const { http, log, resolver } = setup(
      () => {
        calls += 1;
        return calls === 1 ? refusal() : never();
      },
      { timeoutMs: 1000 },
    );
    const pending = resolver.resolve("t1");
    await vi.advanceTimersByTimeAsync(1001);
    expect(await pending).toEqual({ kind: "failure", cause: "timeout" });
    expect(http.requests.length).toBe(2);
    expect(http.requests[1]?.signal.aborted).toBe(true);
    expect(log.entries.some((e) => e.message === "stream.timeout")).toBe(true);
  });
});

describe("chooseStreamFormat", () => {
  it("picks the highest-bitrate mp4 on iOS and never webm, even at a higher bitrate", () => {
    expect(chooseStreamFormat([mp4Low, webmHigh, mp4High], "ios")).toMatchObject({
      url: "test://audio/mp4-high",
    });
  });

  it("prefers mp4 on Android over a higher-bitrate webm", () => {
    expect(chooseStreamFormat([webmHigh, mp4Low], "android")).toMatchObject({
      url: "test://audio/mp4-low",
    });
  });

  it("falls back to the highest-bitrate webm on Android when there is no mp4", () => {
    expect(chooseStreamFormat([webmLow, webmHigh], "android")).toMatchObject({
      url: "test://audio/webm-high",
    });
  });

  it("picks by bitrate whatever the order of the formats", () => {
    const formats = [mp4Low, mp4High, webmHigh];
    expect(chooseStreamFormat(formats, "android")).toEqual(
      chooseStreamFormat([...formats].reverse(), "android"),
    );
  });

  it("skips a format without a url and falls back to the next bitrate", () => {
    const noUrl: StreamFormat = { mimeType: mp4High.mimeType, bitrate: mp4High.bitrate };
    expect(chooseStreamFormat([noUrl, mp4Low], "ios")).toMatchObject({
      url: "test://audio/mp4-low",
    });
  });

  it("matches the container ignoring the codecs parameter and the case", () => {
    const shouting: StreamFormat = {
      mimeType: " Audio/MP4 ;codecs=x",
      bitrate: 1,
      url: "test://a",
    };
    expect(chooseStreamFormat([shouting], "ios")).toMatchObject({ url: "test://a" });
  });

  it("never picks a video format", () => {
    expect(chooseStreamFormat([video], "android")).toBeNull();
  });

  it("keeps the first format on a bitrate tie", () => {
    const first: StreamFormat = { ...mp4High, url: "test://first" };
    const second: StreamFormat = { ...mp4High, url: "test://second" };
    expect(chooseStreamFormat([first, second], "ios")).toMatchObject({ url: "test://first" });
  });

  it("returns null when no format suits the platform", () => {
    expect(chooseStreamFormat([webmHigh], "ios")).toBeNull();
  });
});
