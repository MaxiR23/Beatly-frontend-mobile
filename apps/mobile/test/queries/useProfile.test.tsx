// apps/mobile/test/queries/useProfile.test.tsx
//
// Tests for the profile query hook.
//
// Tested:
// - useProfile
// - useUpdateProfile
//
// What is covered:
// - data unwrapped from the outcome, cache time from Cache-Control, OutcomeError on a failure
// - the saved values are written to the cache, so a failed refetch keeps them drawn
// - the update refetches the profile before it settles, and a username_taken failure leaves it as it was
// - Not applicable: the update's cache time from Cache-Control, because a mutation has none
//
// Run with: pnpm --filter @beatly/mobile test -- useProfile
//
// SEE: apps/mobile/src/queries/useProfile.ts

import { createHttpClient, createProfileService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useProfile, useUpdateProfile } from "../../src/queries/useProfile.ts";
import { makeAuth, makeCore, makeLog, profileFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function setup(
  headers: Record<string, string>,
  response?: { status: number; body: unknown },
  patch?: { status: number; body: unknown },
) {
  const send = jest.fn<HttpPort["send"]>((request) =>
    Promise.resolve({
      status: (request.method === "PATCH" ? patch?.status : response?.status) ?? 200,
      headers,
      body: JSON.stringify(
        (request.method === "PATCH" ? patch?.body : response?.body) ?? {
          ok: true,
          data: profileFixture,
        },
      ),
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

describe("useUpdateProfile", () => {
  it("refetches the profile before it settles, so a mounted reader shows the new values", async () => {
    const updated = { ...profileFixture, display_name: "New" };
    const { send, wrapper } = setup({}, undefined, {
      status: 200,
      body: { ok: true, data: updated },
    });
    const { result } = await renderHook(
      () => ({ profile: useProfile(), update: useUpdateProfile() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.profile.data?.display_name).toBe(profileFixture.display_name);
    });
    // The refetch after the PATCH returns the new profile.
    send.mockImplementation((request) =>
      Promise.resolve({
        status: 200,
        headers: {},
        body: JSON.stringify({
          ok: true,
          data: request.method === "PATCH" || request.method === "GET" ? updated : profileFixture,
        }),
      }),
    );
    await act(async () => {
      await result.current.update.mutateAsync({ display_name: "New" });
    });
    expect(result.current.profile.data?.display_name).toBe("New");
  });

  it("keeps the saved values drawn when the refetch after the save fails", async () => {
    const updated = { ...profileFixture, display_name: "New" };
    const { send, wrapper } = setup({}, undefined, {
      status: 200,
      body: { ok: true, data: updated },
    });
    const { result } = await renderHook(
      () => ({ profile: useProfile(), update: useUpdateProfile() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.profile.data?.display_name).toBe(profileFixture.display_name);
    });
    send.mockImplementation((request) =>
      Promise.resolve(
        request.method === "PATCH"
          ? { status: 200, headers: {}, body: JSON.stringify({ ok: true, data: updated }) }
          : {
              status: 500,
              headers: {},
              body: JSON.stringify({ ok: false, reason: "upstream_error" }),
            },
      ),
    );
    await act(async () => {
      await result.current.update.mutateAsync({ display_name: "New" });
    });
    expect(result.current.profile.data?.display_name).toBe("New");
  });

  it("throws an OutcomeError carrying username_taken and leaves the profile as it was", async () => {
    const { wrapper } = setup({}, undefined, {
      status: 409,
      body: { ok: false, reason: "username_taken" },
    });
    const { result } = await renderHook(
      () => ({ profile: useProfile(), update: useUpdateProfile() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.profile.data).toEqual(profileFixture);
    });
    await act(async () => {
      await expect(
        result.current.update.mutateAsync({ username: "taken_one" }),
      ).rejects.toBeInstanceOf(OutcomeError);
    });
    const error = result.current.update.error;
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "username_taken",
    });
    expect(result.current.profile.data).toEqual(profileFixture);
  });
});
