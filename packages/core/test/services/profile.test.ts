// packages/core/test/services/profile.test.ts
//
// Tests for the profile service.
//
// Tested:
// - createProfileService().getMyProfile
// - createProfileService().updateMyProfile
//
// What is covered:
// - with data, nullable fields, profile_not_found, and the three transport failures
// - the update: only the given fields sent, a cleared name, username_taken and every listed reason, and the three transport failures
//
// Run with: pnpm --filter @beatly/core test -- profile
//
// SEE: packages/core/src/services/profile.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createProfileService, profileReasonSchema } from "../../src/services/profile.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const profile = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "user",
  username: "maxi_23",
  display_name: "Maxi",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function setup(handlers: Record<string, Handler>) {
  const http = createFakeHttp(handlers, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createProfileService(client), http };
}

function setupGet(handler: Handler) {
  return setup({ "GET /profile/me": handler });
}

function setupPatch(handler: Handler) {
  return setup({ "PATCH /profile/me": handler });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getMyProfile", () => {
  it("returns the caller's profile when it exists", async () => {
    const { service, http } = setupGet(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: profile },
    }));
    expect(await service.getMyProfile()).toEqual({
      kind: "success",
      data: profile,
      maxAgeSeconds: 0,
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.method).toBe("GET");
    expect(http.requests[0]?.url).toBe("test://api/profile/me");
    expect(http.requests[0]?.headers.authorization).toBe("Bearer test-token");
  });

  it("returns a profile with no username, display name or avatar as a success", async () => {
    const empty = { ...profile, username: null, display_name: null, avatar_url: null };
    const { service } = setupGet(() => ({ body: { ok: true, data: empty } }));
    expect(await service.getMyProfile()).toEqual({
      kind: "success",
      data: empty,
      maxAgeSeconds: 0,
    });
  });

  it("surfaces profile_not_found as an api failure", async () => {
    const { service } = setupGet(() => ({
      status: 404,
      body: { ok: false, reason: "profile_not_found" },
    }));
    expect(await service.getMyProfile()).toEqual({
      kind: "api_failure",
      reason: "profile_not_found",
    });
    expect(() => profileReasonSchema.parse("profile_not_found")).not.toThrow();
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupGet(never);
    const pending = service.getMyProfile();
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupGet(() => Promise.reject(new Error("offline")));
    expect(await service.getMyProfile()).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome when the profile breaks the contract", async () => {
    const { service } = setupGet(() => ({
      body: { ok: true, data: { ...profile, role: "superuser" } },
    }));
    expect(await service.getMyProfile()).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

describe("updateMyProfile", () => {
  it("returns the updated profile and sends only the given fields", async () => {
    const updated = { ...profile, display_name: "New" };
    const { service, http } = setupPatch(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: updated },
    }));
    expect(await service.updateMyProfile({ display_name: "New" })).toEqual({
      kind: "success",
      data: updated,
      maxAgeSeconds: 0,
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.method).toBe("PATCH");
    expect(http.requests[0]?.url).toBe("test://api/profile/me");
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual({ display_name: "New" });
  });

  it("returns a profile whose name was cleared as a success", async () => {
    const cleared = { ...profile, display_name: null };
    const { service, http } = setupPatch(() => ({ body: { ok: true, data: cleared } }));
    expect(await service.updateMyProfile({ display_name: null })).toEqual({
      kind: "success",
      data: cleared,
      maxAgeSeconds: 0,
    });
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual({ display_name: null });
  });

  it("surfaces username_taken as an api failure", async () => {
    const { service } = setupPatch(() => ({
      status: 409,
      body: { ok: false, reason: "username_taken" },
    }));
    expect(await service.updateMyProfile({ username: "taken_one" })).toEqual({
      kind: "api_failure",
      reason: "username_taken",
    });
    expect(() => profileReasonSchema.parse("username_taken")).not.toThrow();
  });

  it.each([
    ["invalid_request", 422],
    ["profile_not_found", 404],
    ["unauthorized", 401],
    ["upstream_error", 502],
    ["upstream_timeout", 504],
  ])(
    "surfaces every reason PATCH /profile/me lists as an api failure: %s",
    async (reason, status) => {
      const { service } = setupPatch(() => ({ status, body: { ok: false, reason } }));
      expect(await service.updateMyProfile({ display_name: "New" })).toEqual({
        kind: "api_failure",
        reason,
      });
      expect(() => profileReasonSchema.parse(reason)).not.toThrow();
    },
  );

  it("fails with a timeout outcome when the API does not answer the update", async () => {
    vi.useFakeTimers();
    const { service } = setupPatch(never);
    const pending = service.updateMyProfile({ display_name: "New" });
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the update cannot be sent", async () => {
    const { service } = setupPatch(() => Promise.reject(new Error("offline")));
    expect(await service.updateMyProfile({ display_name: "New" })).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the updated profile breaks the contract", async () => {
    const { service } = setupPatch(() => ({
      body: { ok: true, data: { ...profile, role: "superuser" } },
    }));
    expect(await service.updateMyProfile({ display_name: "New" })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});
