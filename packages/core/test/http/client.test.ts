// packages/core/test/http/client.test.ts
//
// Tests for the HTTP client.
//
// Tested:
// - request: success, expected empty, api failure, transport failures
// - request: headers, URL, body, Cache-Control and timers
//
// What is covered:
// - each of the three outcomes, and the four transport causes
//
// Run with: pnpm --filter @beatly/core test -- client
//
// SEE: packages/core/src/http/client.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createHttpClient } from "../../src/http/client.ts";
import type { AuthPort } from "../../src/ports/auth.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const schema = z.object({ id: z.number(), name: z.string() });

function setup(
  handlers: Record<string, Handler>,
  options: { token?: string | null; auth?: AuthPort; timeoutMs?: number } = {},
) {
  const http = createFakeHttp(handlers, BASE_URL);
  const log = createFakeLog();
  const auth = options.auth ?? createFakeAuth(options.token).port;
  const client = createHttpClient({
    http: http.port,
    auth,
    log: log.port,
    baseUrl: BASE_URL,
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  });
  return { client, http, log };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("request", () => {
  it("returns the parsed data as a success when the body is ok: true", async () => {
    const { client } = setup({
      "GET /thing": () => ({ body: { ok: true, data: { id: 1, name: "a", extra: "x" } } }),
    });
    const outcome = await client.request({ path: "/thing", schema });
    expect(outcome).toEqual({ kind: "success", data: { id: 1, name: "a" }, maxAgeSeconds: 0 });
  });

  it("returns a null data as a success when the schema allows it", async () => {
    const { client } = setup({ "GET /thing": () => ({ body: { ok: true, data: null } }) });
    const outcome = await client.request({ path: "/thing", schema: schema.nullable() });
    expect(outcome).toEqual({ kind: "success", data: null, maxAgeSeconds: 0 });
  });

  it("surfaces ok: false as an api failure carrying its reason", async () => {
    const { client } = setup({
      "GET /thing": () => ({ status: 404, body: { ok: false, reason: "playlist_not_found" } }),
    });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });

  it("reads the outcome from the body, not the status", async () => {
    const { client } = setup({
      "GET /thing": () => ({ status: 200, body: { ok: false, reason: "upstream_error" } }),
    });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("surfaces a snake_case reason the contract does not list as an api failure", async () => {
    const { client } = setup({
      "GET /thing": () => ({ status: 429, body: { ok: false, reason: "rate_limited" } }),
    });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "api_failure",
      reason: "rate_limited",
    });
  });

  it("fails with a schema outcome when the reason is not snake_case", async () => {
    const { client } = setup({
      "GET /thing": () => ({ body: { ok: false, reason: "Not Found!" } }),
    });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { client, http, log } = setup({ "GET /thing": never }, { timeoutMs: 1000 });
    const pending = client.request({ path: "/thing", schema });
    await vi.advanceTimersByTimeAsync(1001);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
    expect(http.requests[0]?.signal.aborted).toBe(true);
    expect(log.entries.some((entry) => entry.message === "http.timeout")).toBe(true);
  });

  it("fails with a network outcome when the port rejects", async () => {
    const { client, log } = setup({
      "GET /thing": () => Promise.reject(new Error("offline")),
    });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
    expect(log.entries[0]?.message).toBe("http.network");
  });

  it("fails with a schema outcome when the data does not match the schema", async () => {
    const { client, log } = setup({
      "GET /thing": () => ({ body: { ok: true, data: { id: "nope", name: "secret-value" } } }),
    });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
    const fields = log.entries[0]?.fields;
    expect(fields?.issues).toContain("id");
    expect(JSON.stringify(log.entries)).not.toContain("secret-value");
  });

  it("fails with a schema outcome when the body is not JSON", async () => {
    const { client, log } = setup({ "GET /thing": () => ({ body: "<html>" }) });
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
    expect(log.entries[0]?.message).toBe("http.schema");
  });

  it("fails with an auth outcome when the access token cannot be read", async () => {
    const auth: AuthPort = {
      ...createFakeAuth().port,
      getAccessToken: () => Promise.reject(new Error("no session")),
    };
    const { client, http } = setup(
      { "GET /thing": () => ({ body: { ok: true, data: null } }) },
      { auth },
    );
    expect(await client.request({ path: "/thing", schema })).toEqual({
      kind: "transport_failure",
      cause: "auth",
    });
    expect(http.requests).toEqual([]);
  });

  it("fails with a timeout outcome when the access token read does not settle", async () => {
    vi.useFakeTimers();
    const auth: AuthPort = {
      ...createFakeAuth().port,
      getAccessToken: () => new Promise<string | null>(() => undefined),
    };
    const { client, http, log } = setup(
      { "GET /thing": () => ({ body: { ok: true, data: null } }) },
      { auth, timeoutMs: 1000 },
    );
    const pending = client.request({ path: "/thing", schema });
    await vi.advanceTimersByTimeAsync(1001);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
    expect(http.requests).toEqual([]);
    expect(log.entries.some((entry) => entry.message === "http.timeout")).toBe(true);
  });

  it("sends the access token as a bearer header", async () => {
    const { client, http } = setup(
      { "GET /thing": () => ({ body: { ok: true, data: null } }) },
      { token: "abc" },
    );
    await client.request({ path: "/thing", schema: schema.nullable() });
    expect(http.requests[0]?.headers.authorization).toBe("Bearer abc");
  });

  it("sends no authorization header when signed out", async () => {
    const { client, http } = setup(
      { "GET /thing": () => ({ body: { ok: true, data: null } }) },
      { token: null },
    );
    await client.request({ path: "/thing", schema: schema.nullable() });
    expect(http.requests[0]?.headers).not.toHaveProperty("authorization");
  });

  it("builds the URL from the base URL, the path and the query, skipping undefined values", async () => {
    const { client, http } = setup({ "GET /thing": () => ({ body: { ok: true, data: null } }) });
    await client.request({
      path: "/thing",
      query: { q: "a b&c", limit: 5, skip: undefined, on: true },
      schema: schema.nullable(),
    });
    expect(http.requests[0]?.url).toBe("test://api/thing?q=a%20b%26c&limit=5&on=true");
  });

  it("sends a JSON body with its content type", async () => {
    const { client, http } = setup({ "POST /thing": () => ({ body: { ok: true, data: null } }) });
    await client.request({
      method: "POST",
      path: "/thing",
      body: { name: "x" },
      schema: schema.nullable(),
    });
    expect(http.requests[0]?.body).toBe('{"name":"x"}');
    expect(http.requests[0]?.headers["content-type"]).toBe("application/json");
  });

  it("exposes the max-age of Cache-Control on the success", async () => {
    const { client } = setup({
      "GET /thing": () => ({
        headers: { "cache-control": "private, max-age=120" },
        body: { ok: true, data: null },
      }),
    });
    const outcome = await client.request({ path: "/thing", schema: schema.nullable() });
    expect(outcome).toEqual({ kind: "success", data: null, maxAgeSeconds: 120 });
  });

  it("exposes a zero max-age when Cache-Control is absent", async () => {
    const { client } = setup({ "GET /thing": () => ({ body: { ok: true, data: null } }) });
    const outcome = await client.request({ path: "/thing", schema: schema.nullable() });
    expect(outcome.kind === "success" && outcome.maxAgeSeconds).toBe(0);
  });

  it("leaves no timer running after a response", async () => {
    vi.useFakeTimers();
    const { client } = setup({ "GET /thing": () => ({ body: { ok: true, data: null } }) });
    await client.request({ path: "/thing", schema: schema.nullable() });
    expect(vi.getTimerCount()).toBe(0);
  });
});
