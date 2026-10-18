// packages/core/test/services/bugReports.test.ts
//
// Tests for the bug reports service.
//
// Tested:
// - createBugReport posts the category and the description and returns the report
// - Sends entity_type and entity_id together when a track is attached
// - Surfaces every listed reason as an api failure
// - Fails with a timeout, network or schema outcome
// - listMyBugReports returns the first page, and an empty first page as a success
// - Surfaces every listed reason as an api failure, invalid_cursor included on the first page
// - Fails with a timeout, network or schema outcome
// - Sends the cursor and returns the second page
// - Drops a stale cursor and returns the first page on invalid_cursor
//
// - listBugReports returns every report with its reporter and sends no status for all
// - Sends status=open or status=closed, with the cursor on the next page
// - Returns an empty first page as a success
// - Surfaces every listed reason as an api failure
// - Fails with a timeout, network or schema outcome (an item with no reporter)
// - Drops a stale cursor and refetches the first page with the same status
// - updateBugReportStatus patches the status and returns the report
// - Surfaces every listed reason as an api failure, forbidden and report_not_found included
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure, pagination, creation and triage
//
// Run with: pnpm --filter @beatly/core test -- bugReports
//
// SEE: packages/core/src/services/bugReports.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createBugReportsService } from "../../src/services/bugReports.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const plain = {
  id: "r1",
  reporter_id: "u1",
  category: "playback",
  description: "It stops",
  entity_type: null,
  entity_id: null,
  status: "open",
  created_at: "2026-10-09T12:34:56.123456+00:00",
  updated_at: "2026-10-09T12:34:56.123456+00:00",
};
const linked = {
  ...plain,
  id: "r2",
  category: "ui",
  description: "The cover is cut",
  entity_type: "track",
  entity_id: "t1",
  status: "closed",
};

function pageBody(items: unknown[], page: Record<string, unknown>) {
  return { ok: true, data: { items, page } };
}

function setup(list: Handler, post: Handler = never) {
  const http = createFakeHttp({ "GET /bug-reports/me": list, "POST /bug-reports": post }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createBugReportsService(client), http };
}

const withReporter = {
  ...plain,
  reporter: { id: "u1", display_name: "Maxi", username: "maxi_23" },
};
const nullNames = {
  ...linked,
  reporter: { id: "u2", display_name: null, username: null },
};

function setupTriage(all: Handler, patch: Handler = never) {
  const http = createFakeHttp(
    { "GET /bug-reports": all, "PATCH /bug-reports/r1": patch },
    BASE_URL,
  );
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createBugReportsService(client), http };
}

const failures: [number, string][] = [
  [422, "invalid_request"],
  [401, "unauthorized"],
  [502, "upstream_error"],
  [504, "upstream_timeout"],
];

afterEach(() => {
  vi.useRealTimers();
});

describe("createBugReport", () => {
  it("posts the category and the description and returns the report", async () => {
    const { service, http } = setup(never, () => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: plain },
    }));
    const outcome = await service.createBugReport({
      category: "playback",
      description: "It stops",
    });
    expect(outcome).toEqual({ kind: "success", maxAgeSeconds: 0, data: plain });
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/bug-reports");
    expect(JSON.parse(http.requests[0]?.body ?? "")).toEqual({
      category: "playback",
      description: "It stops",
    });
  });

  it("sends entity_type and entity_id together when a track is attached", async () => {
    const { service, http } = setup(never, () => ({ body: { ok: true, data: linked } }));
    const outcome = await service.createBugReport({
      category: "ui",
      description: "The cover is cut",
      entity: { type: "track", id: "t1" },
    });
    expect(JSON.parse(http.requests[0]?.body ?? "")).toEqual({
      category: "ui",
      description: "The cover is cut",
      entity_type: "track",
      entity_id: "t1",
    });
    expect(outcome.kind === "success" && outcome.data).toEqual(linked);
  });

  it.each(failures)("surfaces %s %s as an api failure", async (status, reason) => {
    const { service } = setup(never, () => ({ status, body: { ok: false, reason } }));
    expect(await service.createBugReport({ category: "other", description: "abcde" })).toEqual({
      kind: "api_failure",
      reason,
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never, never);
    const pending = service.createBugReport({ category: "other", description: "abcde" });
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(never, () => Promise.reject(new Error("offline")));
    expect(await service.createBugReport({ category: "other", description: "abcde" })).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the report has an unknown status", async () => {
    const { service } = setup(never, () => ({
      body: { ok: true, data: { ...plain, status: "pending" } },
    }));
    expect(await service.createBugReport({ category: "other", description: "abcde" })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("listMyBugReports", () => {
  it("returns the first page of the caller's reports", async () => {
    const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };
    const { service, http } = setup(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: pageBody([plain, linked], page),
    }));
    expect(await service.listMyBugReports(null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [plain, linked], page, restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/bug-reports/me");
  });

  it("returns an empty first page as a success when the caller has none", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setup(() => ({ body: pageBody([], page) }));
    const outcome = await service.listMyBugReports(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(page);
  });

  it.each([...failures, [422, "invalid_cursor"] as [number, string]])(
    "surfaces %s %s as an api failure on the first page",
    async (status, reason) => {
      const { service, http } = setup(() => ({ status, body: { ok: false, reason } }));
      expect(await service.listMyBugReports(null)).toEqual({ kind: "api_failure", reason });
      expect(http.requests).toHaveLength(1);
    },
  );

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.listMyBugReports(null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.listMyBugReports(null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an item has no category", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const withoutCategory = { ...plain, category: undefined };
    const { service } = setup(() => ({ body: pageBody([withoutCategory], page) }));
    expect(await service.listMyBugReports(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const { service, http } = setup((req) =>
      req.query.cursor === "c1" ? { body: pageBody([linked], page) } : { body: pageBody([], page) },
    );
    const outcome = await service.listMyBugReports("c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([linked]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(false);
  });

  it("drops a stale cursor and returns the first page on invalid_cursor", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service, http } = setup((req) =>
      req.query.cursor === undefined
        ? { body: pageBody([plain], page) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listMyBugReports("stale");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([plain]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

describe("listBugReports", () => {
  const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };

  it("returns the first page of every report with its reporter and sends no status for all", async () => {
    const { service, http } = setupTriage(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: pageBody([withReporter, nullNames], page),
    }));
    expect(await service.listBugReports(null, null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [withReporter, nullNames], page, restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/bug-reports");
  });

  it.each(["open", "closed"] as const)(
    "sends status=%s and nothing else for that filter",
    async (status) => {
      const { service, http } = setupTriage(() => ({ body: pageBody([withReporter], page) }));
      await service.listBugReports(status, null);
      expect(http.requests[0]?.url).toBe(`test://api/bug-reports?status=${status}`);
    },
  );

  it("sends the status with the cursor on the next page", async () => {
    const { service, http } = setupTriage(() => ({ body: pageBody([withReporter], page) }));
    await service.listBugReports("open", "c1");
    expect(http.requests[0]?.url).toContain("status=open");
    expect(http.requests[0]?.url).toContain("cursor=c1");
  });

  it("returns an empty first page as a success when there are no reports", async () => {
    const empty = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setupTriage(() => ({ body: pageBody([], empty) }));
    expect(await service.listBugReports(null, null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [], page: empty, restartedFromFirstPage: false },
    });
  });

  it.each([
    [422, "invalid_request"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [502, "upstream_error"],
    [504, "upstream_timeout"],
    [422, "invalid_cursor"],
  ] as [number, string][])(
    "surfaces %s %s as an api failure on the first page",
    async (status, reason) => {
      const { service } = setupTriage(() => ({ status, body: { ok: false, reason } }));
      expect(await service.listBugReports(null, null)).toEqual({ kind: "api_failure", reason });
    },
  );

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupTriage(never);
    const pending = service.listBugReports(null, null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupTriage(() => Promise.reject(new Error("offline")));
    expect(await service.listBugReports(null, null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an item has no reporter", async () => {
    const { service } = setupTriage(() => ({ body: pageBody([plain], page) }));
    expect(await service.listBugReports(null, null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("drops a stale cursor and refetches the first page with the same status on invalid_cursor", async () => {
    const { service, http } = setupTriage((req) =>
      req.query.cursor === undefined
        ? { body: pageBody([nullNames], page) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listBugReports("closed", "stale");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).toContain("status=closed");
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([nullNames]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

describe("updateBugReportStatus", () => {
  const closed = { ...plain, status: "closed" };

  it("patches the status of the report and returns it", async () => {
    const { service, http } = setupTriage(never, () => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: closed },
    }));
    expect(await service.updateBugReportStatus("r1", "closed")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: closed,
    });
    expect(http.requests[0]?.method).toBe("PATCH");
    expect(http.requests[0]?.url).toBe("test://api/bug-reports/r1");
    expect(JSON.parse(http.requests[0]?.body ?? "")).toEqual({ status: "closed" });
  });

  it.each([
    [422, "invalid_request"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "report_not_found"],
    [502, "upstream_error"],
    [504, "upstream_timeout"],
  ] as [number, string][])("surfaces %s %s as an api failure", async (status, reason) => {
    const { service } = setupTriage(never, () => ({ status, body: { ok: false, reason } }));
    expect(await service.updateBugReportStatus("r1", "closed")).toEqual({
      kind: "api_failure",
      reason,
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupTriage(never, never);
    const pending = service.updateBugReportStatus("r1", "closed");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupTriage(never, () => Promise.reject(new Error("offline")));
    expect(await service.updateBugReportStatus("r1", "closed")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the report has an unknown status", async () => {
    const { service } = setupTriage(never, () => ({
      body: { ok: true, data: { ...plain, status: "pending" } },
    }));
    expect(await service.updateBugReportStatus("r1", "closed")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});
