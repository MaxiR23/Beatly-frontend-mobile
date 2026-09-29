// packages/core/test/http/paginated.test.ts
//
// Tests for the paginated helper.
//
// Tested:
// - fetchPage: first page, empty page, api failure, schema failure
// - fetchPage: second page with a cursor, invalid_cursor restart, limit
//
// What is covered:
// - the page shape of conventions.md and the cursor echo
//
// Run with: pnpm --filter @beatly/core test -- paginated
//
// SEE: packages/core/src/http/paginated.ts

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createHttpClient } from "../../src/http/client.ts";
import { fetchPage } from "../../src/http/paginated.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const item = z.object({ id: z.number() });

function setup(handlers: Record<string, Handler>) {
  const http = createFakeHttp(handlers, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { client, http };
}

const firstPage = {
  ok: true,
  data: {
    items: [{ id: 1 }, { id: 2 }],
    page: { limit: 2, next_cursor: "c1", has_more: true, total: 3 },
  },
};

describe("fetchPage", () => {
  it("returns the first page when the list has items", async () => {
    const { client, http } = setup({ "GET /items": () => ({ body: firstPage }) });
    const outcome = await fetchPage(client, { path: "/items", item });
    expect(outcome).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: {
        items: [{ id: 1 }, { id: 2 }],
        page: { limit: 2, next_cursor: "c1", has_more: true, total: 3 },
        restartedFromFirstPage: false,
      },
    });
    expect(http.requests[0]?.url).not.toContain("cursor");
  });

  it("returns an empty first page as a success", async () => {
    const { client } = setup({
      "GET /items": () => ({
        body: {
          ok: true,
          data: { items: [], page: { limit: 50, next_cursor: null, has_more: false, total: 0 } },
        },
      }),
    });
    const outcome = await fetchPage(client, { path: "/items", item });
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page.total).toBe(0);
  });

  it("surfaces an api failure other than invalid_cursor as is", async () => {
    const { client, http } = setup({
      "GET /items": () => ({ status: 401, body: { ok: false, reason: "unauthorized" } }),
    });
    expect(await fetchPage(client, { path: "/items", item, cursor: "c1" })).toEqual({
      kind: "api_failure",
      reason: "unauthorized",
    });
    expect(http.requests).toHaveLength(1);
  });

  it("fails with a schema outcome when an item does not match", async () => {
    const { client } = setup({
      "GET /items": () => ({
        body: {
          ok: true,
          data: {
            items: [{ id: "x" }],
            page: { limit: 1, next_cursor: null, has_more: false, total: 1 },
          },
        },
      }),
    });
    expect(await fetchPage(client, { path: "/items", item })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const { client, http } = setup({
      "GET /items": () => ({
        body: {
          ok: true,
          data: {
            items: [{ id: 3 }],
            page: { limit: 2, next_cursor: null, has_more: false, total: null },
          },
        },
      }),
    });
    const outcome = await fetchPage(client, { path: "/items", item, cursor: "c1" });
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([{ id: 3 }]);
    expect(outcome.kind === "success" && outcome.data.page.total).toBeNull();
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(false);
  });

  it("drops the cursor and refetches the first page on invalid_cursor", async () => {
    const { client, http } = setup({
      "GET /items": (req) =>
        req.query.cursor === undefined
          ? { body: firstPage }
          : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    });
    const outcome = await fetchPage(client, { path: "/items", item, cursor: "stale" });
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });

  it("returns invalid_cursor as an api failure when no cursor was sent", async () => {
    const { client, http } = setup({
      "GET /items": () => ({ status: 422, body: { ok: false, reason: "invalid_cursor" } }),
    });
    expect(await fetchPage(client, { path: "/items", item })).toEqual({
      kind: "api_failure",
      reason: "invalid_cursor",
    });
    expect(http.requests).toHaveLength(1);
  });

  it("sends limit only when given", async () => {
    const { client, http } = setup({ "GET /items": () => ({ body: firstPage }) });
    await fetchPage(client, { path: "/items", item });
    await fetchPage(client, { path: "/items", item, limit: 20 });
    expect(http.requests[0]?.url).not.toContain("limit");
    expect(http.requests[1]?.url).toContain("limit=20");
  });
});
