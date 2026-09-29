// apps/mobile/test/queries/useRecents.test.tsx
//
// Tests for the recents query hook.
//
// Tested:
// - useRecents
//
// What is covered:
// - items unwrapped from the page, cache time from Cache-Control, OutcomeError on a failure
//
// Run with: pnpm --filter @beatly/mobile test -- useRecents
//
// SEE: apps/mobile/src/queries/useRecents.ts

import { createActivityService, createHttpClient } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { useRecents } from "../../src/queries/useRecents.ts";
import { makeAuth, makeCore, makeLog, recentFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 30, next_cursor: null, has_more: false, total: 1 };

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(
        response?.body ?? { ok: true, data: { items: [recentFixture], page: PAGE } },
      ),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, activity: createActivityService(client) };
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useRecents(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useRecents", () => {
  it("returns the recent items unwrapped from the page", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual([recentFixture]);
  });

  it("keeps recents fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats recents' private, no-cache as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("throws an OutcomeError carrying the api failure", async () => {
    const { wrapper } = setup({}, { status: 502, body: { ok: false, reason: "upstream_error" } });
    const { result } = await mountAndSettle(wrapper);
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });
});
