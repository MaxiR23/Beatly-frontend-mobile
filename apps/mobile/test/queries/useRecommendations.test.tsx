// apps/mobile/test/queries/useRecommendations.test.tsx
//
// Tests for the recommendations query hook.
//
// Tested:
// - useRecommendations
//
// What is covered:
// - the data unwrapped from the outcome, cache time from Cache-Control, OutcomeError on a failure
//
// Run with: pnpm --filter @beatly/mobile test -- useRecommendations
//
// SEE: apps/mobile/src/queries/useRecommendations.ts

import { createHttpClient, createRecommendationsService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { useRecommendations } from "../../src/queries/useRecommendations.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { makeAuth, makeCore, makeLog, recommendationsFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data: recommendationsFixture }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = {
    ...makeCore().core,
    auth,
    log,
    recommendations: createRecommendationsService(client),
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
  const rendered = await renderHook(() => useRecommendations(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useRecommendations", () => {
  it("calls POST /recommendations/generate and returns the data unwrapped", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", url: "test://api/recommendations/generate" }),
    );
    expect(result.current.data).toEqual(recommendationsFixture);
  });

  it("keeps the recommendations fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats private, no-cache as stale and calls the route again on the next mount", async () => {
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
