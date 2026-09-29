// apps/mobile/test/adapters/http.test.ts
//
// Tests for the http adapter.
//
// Tested:
// - createHttpAdapter
//
// What is covered:
// - header names are lower-cased, the body is read as text, no body key without a body, a rejected fetch rejects
//
// Run with: pnpm --filter @beatly/mobile test -- http
//
// SEE: apps/mobile/src/adapters/http.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { createHttpAdapter } from "../../src/adapters/http.ts";

afterEach(() => {
  jest.restoreAllMocks();
});

const signal = new AbortController().signal;

describe("createHttpAdapter", () => {
  it("lowercases response header names", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { headers: { "Cache-Control": "max-age=5" } }));
    const response = await createHttpAdapter().send({
      method: "GET",
      url: "test://api/x",
      headers: {},
      signal,
    });
    expect(response.headers["cache-control"]).toBe("max-age=5");
    expect(Object.keys(response.headers).every((name) => name === name.toLowerCase())).toBe(true);
  });

  it("returns the body as text with the status", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    const response = await createHttpAdapter().send({
      method: "POST",
      url: "test://api/x",
      headers: {},
      body: "{}",
      signal,
    });
    expect(response.status).toBe(201);
    expect(response.body).toBe('{"ok":true}');
  });

  it("omits body from the fetch init when the request has none", async () => {
    const spy = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    await createHttpAdapter().send({ method: "GET", url: "test://api/x", headers: {}, signal });
    const init = spy.mock.calls[0]?.[1];
    expect(init).toBeDefined();
    expect(init !== undefined && "body" in init).toBe(false);
  });

  it("rejects when fetch rejects", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await expect(
      createHttpAdapter().send({ method: "GET", url: "test://api/x", headers: {}, signal }),
    ).rejects.toThrow("offline");
  });
});
