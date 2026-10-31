// apps/mobile/test/queries/useOnboarding.test.tsx
//
// Tests for the onboarding query hooks.
//
// Tested:
// - useOnboardingArtists, useSimilarArtists, useFinishOnboarding, useMarkOnboarded, useOnboardingMark, useRecordOnboarded
//
// What is covered:
// - the curated list unwrapped from the first page, its cache time from Cache-Control
// - similar returning the artists of the route with the posted artist and exclusions, and throwing an OutcomeError carrying the api failure
// - finish returning the completion data, and throwing an OutcomeError carrying too_few_artists
// - the completion written into the cached profile and the profile refetched
// - the device mark: read for the signed-in account, not read while disabled, stored and cached as true without a refetch
// - Not applicable: the mutations' cache time and the mark's Cache-Control, because a mutation and local data have none
//
// Run with: pnpm --filter @beatly/mobile test -- useOnboarding
//
// SEE: apps/mobile/src/queries/useOnboarding.ts

import {
  createHttpClient,
  createOnboardingService,
  createRecommendationsService,
  ONBOARDING_MARK_KEY,
} from "@beatly/core";
import type { HttpPort, Profile, Success } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import {
  onboardingMarkQueryKey,
  useFinishOnboarding,
  useMarkOnboarded,
  useOnboardingArtists,
  useOnboardingMark,
  useRecordOnboarded,
  useSimilarArtists,
} from "../../src/queries/useOnboarding.ts";
import { profileQueryKey, useProfile } from "../../src/queries/useProfile.ts";
import {
  completionFixture,
  makeAuth,
  makeCore,
  makeLog,
  memoryStorage,
  onboardingArtistsFixture,
  profileFixture,
  Wrapper,
} from "../helpers/core.tsx";
import { createTestQueryClient } from "../helpers/queryClient.ts";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 50, next_cursor: null, has_more: false, total: 6 };

function setup(headers: Record<string, string>, post?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>((request) => {
    if (request.method === "POST") {
      const path = new URL(request.url).pathname;
      return Promise.resolve({
        status: post?.status ?? 200,
        headers,
        body: JSON.stringify(
          post?.body ??
            (path === "/onboarding/complete"
              ? { ok: true, data: completionFixture }
              : path === "/onboarding/similar"
                ? { ok: true, data: { artists: onboardingArtistsFixture.slice(0, 3) } }
                : {
                    ok: true,
                    data: {
                      albums_for_you: [],
                      seed_sections: [],
                      recommended_albums: [],
                      recommended_artists: [],
                      artists: [],
                      albums: [],
                      generated_at: null,
                      valid_until: null,
                    },
                  }),
        ),
      });
    }
    return Promise.resolve({
      status: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: { items: onboardingArtistsFixture, page: PAGE },
      }),
    });
  });
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const recommendations = createRecommendationsService(client);
  const core: Core = {
    ...makeCore().core,
    auth,
    log,
    onboarding: createOnboardingService(client, recommendations),
    recommendations,
  };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper, queryClient };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useOnboardingArtists(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useOnboardingArtists", () => {
  it("returns the first page's items unwrapped", async () => {
    const { wrapper, send } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual(onboardingArtistsFixture);
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/onboarding/artists");
  });

  it("keeps the curated list fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("is stale at once with private, no-cache", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("useSimilarArtists", () => {
  it("returns the artists of the route", async () => {
    const { wrapper, send } = setup({});
    const { result } = await renderHook(() => useSimilarArtists(), { wrapper });
    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ artistId: "UC9", excludeIds: ["UC1", "UC2"] });
    });
    expect(data).toEqual(onboardingArtistsFixture.slice(0, 3));
    expect(JSON.parse(send.mock.calls[0]?.[0].body ?? "null")).toEqual({
      artist_id: "UC9",
      exclude_ids: ["UC1", "UC2"],
    });
  });

  it("throws an OutcomeError carrying the api failure", async () => {
    const { wrapper } = setup({}, { status: 502, body: { ok: false, reason: "upstream_error" } });
    const { result } = await renderHook(() => useSimilarArtists(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ artistId: "UC9", excludeIds: [] }).catch(() => undefined);
    });
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });
});

describe("useFinishOnboarding", () => {
  it("returns the completion data", async () => {
    const { wrapper } = setup({});
    const { result } = await renderHook(() => useFinishOnboarding(), { wrapper });
    let data;
    await act(async () => {
      data = await result.current.mutateAsync(["UC1", "UC2", "UC3", "UC4", "UC5"]);
    });
    expect(data).toEqual(completionFixture);
  });

  it("throws an OutcomeError carrying too_few_artists", async () => {
    const { wrapper } = setup({}, { status: 422, body: { ok: false, reason: "too_few_artists" } });
    const { result } = await renderHook(() => useFinishOnboarding(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(["UC1"]).catch(() => undefined);
    });
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "too_few_artists",
    });
  });
});

describe("useMarkOnboarded", () => {
  it("writes onboarding_completed_at into the cached profile and refetches it", async () => {
    const pending: Profile = { ...profileFixture, onboarding_completed_at: null };
    // The first read answers; the refetch after the write stays pending, so the cache shows what was written.
    let reads = 0;
    const ctx = makeCore({
      getMyProfile: () => {
        reads += 1;
        return reads === 1
          ? Promise.resolve({ kind: "success", data: pending, maxAgeSeconds: 0 })
          : new Promise(() => undefined);
      },
    });
    const queryClient: QueryClient = createTestQueryClient();
    queryClient.setQueryData<Success<Profile>>(profileQueryKey, {
      kind: "success",
      data: pending,
      maxAgeSeconds: 0,
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core} client={queryClient}>
        {children}
      </Wrapper>
    );
    const { result } = await renderHook(() => useMarkOnboarded(), { wrapper });
    // An observer, so the invalidation has something to refetch.
    const reader = await renderHook(() => useProfile(), { wrapper });
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    await act(() => {
      result.current("2026-10-30T12:00:00+00:00");
      return Promise.resolve();
    });
    expect(
      queryClient.getQueryData<Success<Profile>>(profileQueryKey)?.data.onboarding_completed_at,
    ).toBe("2026-10-30T12:00:00+00:00");
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(2);
    });
    expect(reader.result.current.data).toBeDefined();
  });
});

describe("useOnboardingMark", () => {
  function markSetup(stored: Record<string, string>) {
    const ctx = makeCore({ storage: memoryStorage(stored) });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core} client={queryClient}>
        {children}
      </Wrapper>
    );
    return { ctx, queryClient, wrapper };
  }

  it("reads the mark of the signed-in account from the device", async () => {
    const { wrapper } = markSetup({ [ONBOARDING_MARK_KEY]: "user-1" });
    const { result } = await renderHook(() => useOnboardingMark(true), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBe(true);
    });
  });

  it("is false for another account's mark", async () => {
    const { wrapper } = markSetup({ [ONBOARDING_MARK_KEY]: "user-2" });
    const { result } = await renderHook(() => useOnboardingMark(true), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBe(false);
    });
  });

  it("does not read while disabled", async () => {
    const { ctx, wrapper } = markSetup({ [ONBOARDING_MARK_KEY]: "user-1" });
    const { result } = await renderHook(() => useOnboardingMark(false), { wrapper });
    await act(() => Promise.resolve());
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    expect(ctx.auth.getUserId).not.toHaveBeenCalled();
  });

  it("stores the mark and caches true without refetching", async () => {
    const { ctx, queryClient, wrapper } = markSetup({});
    const { result } = await renderHook(() => useRecordOnboarded(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(await ctx.storage.get(ONBOARDING_MARK_KEY)).toBe("user-1");
    expect(queryClient.getQueryData(onboardingMarkQueryKey)).toEqual({
      kind: "success",
      data: true,
    });
    expect(ctx.auth.getUserId).toHaveBeenCalledTimes(1);
  });
});
