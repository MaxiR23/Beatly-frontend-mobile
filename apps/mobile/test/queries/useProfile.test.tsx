// apps/mobile/test/queries/useProfile.test.tsx
//
// Tests for the profile query hook.
//
// Tested:
// - useProfile
//
// What is covered:
// - data unwrapped from the outcome, cache time from Cache-Control, OutcomeError on a failure
//
// Run with: pnpm --filter @beatly/mobile test -- useProfile
//
// SEE: apps/mobile/src/queries/useProfile.ts

import { createHttpClient, createProfileService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useProfile } from "../../src/queries/useProfile.ts";
import { makeAuth, makeCore, makeLog, profileFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data: profileFixture }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, profile: createProfileService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useProfile(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useProfile", () => {
  it("returns the profile data unwrapped from the outcome", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual(profileFixture);
  });

  it("keeps the profile fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats the profile's private, no-cache as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("throws an OutcomeError carrying profile_not_found", async () => {
    const { wrapper } = setup(
      {},
      { status: 404, body: { ok: false, reason: "profile_not_found" } },
    );
    const { result } = await mountAndSettle(wrapper);
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "profile_not_found",
    });
  });
});
