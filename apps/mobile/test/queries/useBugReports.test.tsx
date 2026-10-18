// apps/mobile/test/queries/useBugReports.test.tsx
//
// Tests for the bug reports query hooks.
//
// Tested:
// - useMyBugReports
// - useCreateBugReport
// - useAllBugReports
// - useSetBugReportStatus
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
// - the filtered list unwrapped, cache time from Cache-Control, and a new list from the first page when the filter changes
// - the status rewritten in every cached filter before the request settles, every filter refetched after, and every filter restored when it fails
// - creation refetching My reports, and a rejected creation surfacing its outcome without refetching
//
// Run with: pnpm --filter @beatly/mobile test -- useBugReports
//
// SEE: apps/mobile/src/queries/useBugReports.ts

import { createBugReportsService, createHttpClient } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import {
  allBugReportsFilterKey,
  useAllBugReports,
  useCreateBugReport,
  useMyBugReports,
  useSetBugReportStatus,
  type BugReportFilter,
} from "../../src/queries/useBugReports.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import {
  bugReportFixture,
  makeAuth,
  makeCore,
  makeLog,
  triageReportFixture,
  Wrapper,
} from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 50, next_cursor: null, has_more: false, total: 1 };

function setup(headers: Record<string, string>, postStatus = 200, postReason = "upstream_error") {
  const send = jest.fn<HttpPort["send"]>((request) => {
    if (request.method === "POST") {
      return Promise.resolve({
        status: postStatus,
        headers,
        body: JSON.stringify(
          postStatus === 200
            ? { ok: true, data: bugReportFixture }
            : { ok: false, reason: postReason },
        ),
      });
    }
    return Promise.resolve({
      status: 200,
      headers,
      body: JSON.stringify({ ok: true, data: { items: [bugReportFixture], page: PAGE } }),
    });
  });
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = {
    ...makeCore().core,
    auth,
    log,
    bugReports: createBugReportsService(client),
  };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useMyBugReports(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

function getCount(send: jest.Mock<HttpPort["send"]>) {
  return send.mock.calls.filter(([request]) => request.method === "GET").length;
}

describe("useMyBugReports", () => {
  it("returns the reports of the first page", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual([bugReportFixture]);
  });

  it("keeps the reports fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats the reports' private, no-cache as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("useCreateBugReport", () => {
  const input = { category: "playback", description: "It stops" } as const;

  it("refetches My reports once the report is created", async () => {
    const { send, wrapper } = setup({});
    const { result } = await renderHook(
      () => ({ list: useMyBugReports(), create: useCreateBugReport() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.isFetching).toBe(false);
    });
    expect(getCount(send)).toBe(1);
    await act(() => result.current.create.mutateAsync(input));
    await waitFor(() => {
      expect(getCount(send)).toBe(2);
    });
  });

  it("surfaces a rejected creation as an OutcomeError and refetches nothing", async () => {
    const { send, wrapper } = setup({}, 502, "upstream_error");
    const { result } = await renderHook(
      () => ({ list: useMyBugReports(), create: useCreateBugReport() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.isFetching).toBe(false);
    });
    await act(() => {
      result.current.create.mutate(input);
    });
    await waitFor(() => {
      expect(result.current.create.isError).toBe(true);
    });
    const error = result.current.create.error;
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
    expect(getCount(send)).toBe(1);
  });
});

function setupTriage(
  headers: Record<string, string>,
  patch: () => Promise<{ status: number; headers: Record<string, string>; body: string }>,
  pageCursor: string | null = null,
) {
  const send = jest.fn<HttpPort["send"]>((request) => {
    if (request.method === "PATCH") return patch();
    return Promise.resolve({
      status: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: {
          items: [triageReportFixture],
          page: { ...PAGE, next_cursor: pageCursor, has_more: pageCursor !== null },
        },
      }),
    });
  });
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = {
    ...makeCore().core,
    auth,
    log,
    bugReports: createBugReportsService(client),
  };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper, queryClient };
}

const patched = (status: string) => ({
  status: 200,
  headers: {},
  body: JSON.stringify({ ok: true, data: { ...bugReportFixture, status } }),
});

function statusesOf(data: unknown): string[] {
  return (data as { pages: { data: { items: { status: string }[] } }[] }).pages.flatMap((page) =>
    page.data.items.map((item) => item.status),
  );
}

describe("useAllBugReports", () => {
  it("unwraps the first page and takes its cache time from Cache-Control", async () => {
    const { send, wrapper } = setupTriage({ "cache-control": "max-age=60" }, () =>
      Promise.resolve(patched("closed")),
    );
    const mount = async () => {
      const rendered = await renderHook(() => useAllBugReports("all"), { wrapper });
      await waitFor(() => {
        expect(rendered.result.current.isFetching).toBe(false);
      });
      return rendered;
    };
    const { result } = await mount();
    expect(result.current.data).toEqual([triageReportFixture]);
    await mount();
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mount();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats private, no-cache as stale", async () => {
    const { send, wrapper } = setupTriage({ "cache-control": "private, no-cache" }, () =>
      Promise.resolve(patched("closed")),
    );
    for (let i = 0; i < 2; i++) {
      const rendered = await renderHook(() => useAllBugReports("all"), { wrapper });
      await waitFor(() => {
        expect(rendered.result.current.isFetching).toBe(false);
      });
    }
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("opens a new list from the first page when the filter changes", async () => {
    const { send, wrapper } = setupTriage({}, () => Promise.resolve(patched("closed")), "c1");
    const { result, rerender } = await renderHook(
      (props: { filter: BugReportFilter }) => useAllBugReports(props.filter),
      { wrapper, initialProps: { filter: "all" } },
    );
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
    await act(() => {
      result.current.loadMore();
    });
    await waitFor(() => {
      expect(String(send.mock.calls.at(-1)?.[0].url)).toContain("cursor=c1");
    });
    await rerender({ filter: "open" });
    await waitFor(() => {
      const last = String(send.mock.calls.at(-1)?.[0].url);
      expect(last).toContain("status=open");
      expect(last).not.toContain("cursor");
    });
  });
});

describe("useSetBugReportStatus", () => {
  async function seeded(patch: () => Promise<ReturnType<typeof patched>>) {
    const ctx = setupTriage({ "cache-control": "private, no-cache" }, patch);
    const rendered = await renderHook(
      (props: { filter: BugReportFilter }) => ({
        list: useAllBugReports(props.filter),
        set: useSetBugReportStatus(),
      }),
      { wrapper: ctx.wrapper, initialProps: { filter: "all" } },
    );
    await waitFor(() => {
      expect(rendered.result.current.list.isFetching).toBe(false);
    });
    await rendered.rerender({ filter: "open" });
    await waitFor(() => {
      expect(rendered.result.current.list.isFetching).toBe(false);
    });
    return { ...ctx, ...rendered };
  }

  it("rewrites the status in every cached filter before the request settles, then refetches them", async () => {
    let release: (value: ReturnType<typeof patched>) => void = () => undefined;
    const held = new Promise<ReturnType<typeof patched>>((resolve) => {
      release = resolve;
    });
    const { result, queryClient, send } = await seeded(() => held);
    expect(statusesOf(queryClient.getQueryData(allBugReportsFilterKey("all")))).toEqual(["open"]);
    await act(() => {
      result.current.set.mutate({ id: "r1", status: "closed" });
    });
    await waitFor(() => {
      expect(statusesOf(queryClient.getQueryData(allBugReportsFilterKey("all")))).toEqual([
        "closed",
      ]);
    });
    expect(statusesOf(queryClient.getQueryData(allBugReportsFilterKey("open")))).toEqual([
      "closed",
    ]);
    const before = send.mock.calls.length;
    await act(() => {
      release(patched("closed"));
    });
    await waitFor(() => {
      expect(result.current.set.isSuccess).toBe(true);
    });
    await waitFor(() => {
      expect(send.mock.calls.length).toBeGreaterThan(before);
    });
    expect(queryClient.getQueryState(allBugReportsFilterKey("all"))?.isInvalidated).toBe(true);
  });

  it("restores every cached filter when the update fails", async () => {
    const { result, queryClient } = await seeded(() =>
      Promise.resolve({
        status: 502,
        headers: {},
        body: JSON.stringify({ ok: false, reason: "upstream_error" }),
      }),
    );
    await act(() => {
      result.current.set.mutate({ id: "r1", status: "closed" });
    });
    await waitFor(() => {
      expect(result.current.set.isError).toBe(true);
    });
    const error = result.current.set.error;
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
    await waitFor(() => {
      expect(statusesOf(queryClient.getQueryData(allBugReportsFilterKey("all")))).toEqual(["open"]);
    });
    expect(statusesOf(queryClient.getQueryData(allBugReportsFilterKey("open")))).toEqual(["open"]);
  });
});
