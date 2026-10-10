// packages/core/test/services/errors.test.ts
//
// Tests for the errors service.
//
// Tested:
// - reportPlayback posts the report and returns a null success, also for a duplicate answer
// - reportPlayback surfaces rate_limited; fails with a timeout, network or schema outcome
//
// What is covered:
// - with data, api failure, transport failure
// - Not applicable: expected empty, because the route is a write whose only success is data null
//
// Run with: pnpm --filter @beatly/core test -- errors
//
// SEE: packages/core/src/services/errors.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createErrorsService, type PlaybackErrorReport } from "../../src/services/errors.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const report: PlaybackErrorReport = {
  track_id: "t1",
  platform: "ios",
  os_version: "18.0",
  app_version: "0.6.0",
  stage: "resolve",
  error_code: "unplayable",
  error_message: "Stream resolution returned no playable stream",
};

function setup(handler: Handler) {
  const http = createFakeHttp({ "POST /errors/playback": handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createErrorsService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("reportPlayback", () => {
  it("posts the report with its fields and returns success", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "no-store" },
      body: { ok: true, data: null },
    }));
    expect(await service.reportPlayback(report)).toEqual({
      kind: "success",
      data: null,
      maxAgeSeconds: 0,
    });
    const request = http.requests[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("test://api/errors/playback");
    expect(request?.headers.authorization).toBeDefined();
    const body: unknown = JSON.parse(request?.body ?? "null");
    expect(body).toEqual(report);
    expect(body).not.toHaveProperty("http_status");
  });

  it("sends the http status when given", async () => {
    const { service, http } = setup(() => ({ body: { ok: true, data: null } }));
    await service.reportPlayback({ ...report, http_status: 403 });
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual({ ...report, http_status: 403 });
  });

  it("treats a duplicate answer, data null, as the same success", async () => {
    const { service } = setup(() => ({ body: { ok: true, data: null } }));
    const outcome = await service.reportPlayback(report);
    expect(outcome.kind).toBe("success");
  });

  it("surfaces rate_limited as an api failure", async () => {
    const { service } = setup(() => ({
      status: 429,
      body: { ok: false, reason: "rate_limited" },
    }));
    expect(await service.reportPlayback(report)).toEqual({
      kind: "api_failure",
      reason: "rate_limited",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.reportPlayback(report);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request throws", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.reportPlayback(report)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when data is not null", async () => {
    const { service } = setup(() => ({ body: { ok: true, data: { stored: true } } }));
    expect(await service.reportPlayback(report)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});
