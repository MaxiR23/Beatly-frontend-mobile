// apps/mobile/test/queries/useSearch.test.tsx
//
// Tests for the search query hook.
//
// Tested:
// - useSearch
//
// What is covered:
// - the result unwrapped from the outcome, cache time from Cache-Control, no call for an empty query, OutcomeError on a failure
//
// Run with: pnpm --filter @beatly/mobile test -- useSearch
//
// SEE: apps/mobile/src/queries/useSearch.ts

import { createHttpClient, createSearchService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { useSearch } from "../../src/queries/useSearch.ts";
import { makeAuth, makeCore, makeLog, searchResultFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data: searchResultFixture }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, search: createSearchService(client) };
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"], query = "daft") {
  const rendered = await renderHook(() => useSearch(query), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useSearch", () => {
  it("returns the search result", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual(searchResultFixture);
  });

  it("keeps a query fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats a no-store result as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "no-store" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not call the API for an empty query", async () => {
    const { send, wrapper } = setup({});
    const { result } = await renderHook(() => useSearch(""), { wrapper });
    expect(send).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
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
