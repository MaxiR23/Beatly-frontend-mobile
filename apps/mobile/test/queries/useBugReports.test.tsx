// apps/mobile/test/queries/useBugReports.test.tsx
//
// Tests for the bug reports query hooks.
//
// Tested:
// - useMyBugReports
// - useCreateBugReport
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
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
import { useCreateBugReport, useMyBugReports } from "../../src/queries/useBugReports.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { bugReportFixture, makeAuth, makeCore, makeLog, Wrapper } from "../helpers/core.tsx";

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
