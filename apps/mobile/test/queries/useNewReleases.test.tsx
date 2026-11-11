// apps/mobile/test/queries/useNewReleases.test.tsx
//
// Tests for the new releases query hook.
//
// Tested:
// - useNewReleases
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control (max-age and no-store), OutcomeError on a failure
//
// Run with: pnpm --filter @beatly/mobile test -- useNewReleases
//
// SEE: apps/mobile/src/queries/useNewReleases.ts

import { createHttpClient, createReleasesService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { useNewReleases } from "../../src/queries/useNewReleases.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { makeAuth, makeCore, makeLog, newReleaseFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 50, next_cursor: null, has_more: false, total: 1 };

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(
        response?.body ?? { ok: true, data: { items: [newReleaseFixture], page: PAGE } },
      ),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, releases: createReleasesService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useNewReleases(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useNewReleases", () => {
  it("returns the releases of the first page", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual([newReleaseFixture]);
  });

  it("keeps new releases fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats new releases' no-store as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "no-store" });
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
