// apps/mobile/test/queries/queryClient.test.ts
//
// Tests for the QueryClient factory.
//
// Tested:
// - createQueryClient staleTime from the max-age of a core outcome
// - staleTimeFor
// - a failed query is not retried
// - the smallest max-age across the pages of an infinite query
// - queries pause offline and run or refetch when the connection returns, loaded data stays, mutations run offline
//
// What is covered:
// - fresh within max-age, stale without Cache-Control, stale for data that is not an outcome
//
// Run with: pnpm --filter @beatly/mobile test -- queryClient
//
// SEE: apps/mobile/src/queries/queryClient.ts

import { createHttpClient, pageBlockSchema } from "@beatly/core";
import type { AuthPort, HttpPort, LogPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  MutationObserver,
  onlineManager,
  QueryObserver,
  type QueryClient,
} from "@tanstack/react-query";

import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient, staleTimeFor } from "../../src/queries/queryClient.ts";

const auth: AuthPort = {
  getAccessToken: () => Promise.resolve(null),
  getStatus: () => Promise.resolve("signed_out"),
  getEmail: () => Promise.resolve(null),
  getUserId: () => Promise.resolve(null),
  onAuthChange: () => () => undefined,
  signIn: () => Promise.resolve({ kind: "success" }),
  signUp: () => Promise.resolve({ kind: "confirmation_sent" }),
  signOut: () => Promise.resolve({ kind: "success" }),
  confirmEmail: () => Promise.resolve({ kind: "success" }),
};
const log: LogPort = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function setup(headers: Record<string, string>) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: { limit: 1, next_cursor: null, has_more: false, total: 0 },
      }),
    }),
  );
  const http = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const queryClient = createQueryClient();
  const fetchThing = () =>
    queryClient.query({
      queryKey: ["thing"],
      queryFn: () => http.request({ path: "/thing", schema: pageBlockSchema }),
    });
  return { send, queryClient, fetchThing };
}

let current: QueryClient | undefined;

afterEach(() => {
  current?.unmount();
  current?.clear();
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

describe("createQueryClient", () => {
  it("keeps a response fresh for its Cache-Control max-age", async () => {
    jest.useFakeTimers();
    const { send, queryClient, fetchThing } = setup({ "cache-control": "max-age=60" });
    current = queryClient;
    await fetchThing();
    await fetchThing();
    expect(send).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(61_000);
    await fetchThing();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats a response without Cache-Control as stale", async () => {
    const { send, queryClient, fetchThing } = setup({});
    current = queryClient;
    await fetchThing();
    await fetchThing();
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("failed queries", () => {
  it("does not retry a failed query", async () => {
    const queryClient = createQueryClient();
    current = queryClient;
    const queryFn = jest.fn(() => Promise.reject(new Error("boom")));
    await expect(queryClient.query({ queryKey: ["fail"], queryFn })).rejects.toThrow("boom");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

describe("connection", () => {
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it("pauses a query while offline and runs it when the connection returns", async () => {
    const queryClient = createQueryClient();
    current = queryClient;
    queryClient.mount();
    const queryFn = jest.fn(() => Promise.resolve("loaded"));
    onlineManager.setOnline(false);
    const observer = new QueryObserver(queryClient, { queryKey: ["paused"], queryFn });
    const stop = observer.subscribe(() => undefined);
    await settle();
    expect(queryFn).not.toHaveBeenCalled();
    expect(observer.getCurrentResult().fetchStatus).toBe("paused");
    onlineManager.setOnline(true);
    await settle();
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data).toBe("loaded");
    stop();
  });

  it("refetches a query that failed with a network error when the connection returns", async () => {
    const queryClient = createQueryClient();
    current = queryClient;
    queryClient.mount();
    const queryFn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new OutcomeError({ kind: "transport_failure", cause: "network" }))
      .mockResolvedValue("loaded");
    const observer = new QueryObserver(queryClient, { queryKey: ["failed"], queryFn });
    const stop = observer.subscribe(() => undefined);
    await settle();
    expect(observer.getCurrentResult().isError).toBe(true);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await settle();
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(observer.getCurrentResult().data).toBe("loaded");
    stop();
  });

  it("keeps loaded data while offline", async () => {
    const queryClient = createQueryClient();
    current = queryClient;
    const queryFn = jest.fn(() => Promise.resolve("loaded"));
    const observer = new QueryObserver(queryClient, { queryKey: ["kept"], queryFn });
    const stop = observer.subscribe(() => undefined);
    await settle();
    onlineManager.setOnline(false);
    void observer.refetch();
    await settle();
    const result = observer.getCurrentResult();
    expect(result.data).toBe("loaded");
    expect(result.status).toBe("success");
    expect(queryFn).toHaveBeenCalledTimes(1);
    stop();
  });

  it("runs a mutation while offline", async () => {
    const queryClient = createQueryClient();
    current = queryClient;
    const mutationFn = jest.fn(() => Promise.resolve("done"));
    onlineManager.setOnline(false);
    const observer = new MutationObserver(queryClient, { mutationFn });
    await observer.mutate();
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});

describe("staleTimeFor", () => {
  it("treats data that is not an outcome as stale", () => {
    expect(staleTimeFor("x")).toBe(0);
  });

  it("converts the max-age of an outcome to milliseconds", () => {
    expect(staleTimeFor({ kind: "success", data: null, maxAgeSeconds: 2 })).toBe(2000);
  });

  it("uses the smallest max-age across the pages of an infinite query", () => {
    const pages = [
      { kind: "success", data: null, maxAgeSeconds: 60 },
      { kind: "success", data: null, maxAgeSeconds: 10 },
    ];
    expect(staleTimeFor({ pages, pageParams: [null, "c1"] })).toBe(10_000);
  });

  it("is stale for an infinite query with no pages", () => {
    expect(staleTimeFor({ pages: [], pageParams: [] })).toBe(0);
  });
});
