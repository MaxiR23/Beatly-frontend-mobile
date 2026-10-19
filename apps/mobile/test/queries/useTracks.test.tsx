// apps/mobile/test/queries/useTracks.test.tsx
//
// Tests for the track query hooks.
//
// Tested:
// - useUpNext, useLyrics, useRelated, useCredits
//
// What is covered:
// - the data unwrapped from the outcome, cache time from Cache-Control, one cache entry per track
// - OutcomeError carrying track_not_found
// - useUpNext reading without refetching on mount: a stale outcome kept, an empty cache still fetched
//
// Run with: pnpm --filter @beatly/mobile test -- useTracks
//
// SEE: apps/mobile/src/queries/useTracks.ts

import { createHttpClient, createTracksService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useCredits, useLyrics, useRelated, useUpNext } from "../../src/queries/useTracks.ts";
import {
  creditsFixture,
  lyricsFixture,
  makeAuth,
  makeCore,
  makeLog,
  relatedFixture,
  upNextFixture,
  Wrapper,
} from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function setup(
  data: unknown,
  headers: Record<string, string>,
  response?: { status: number; body: unknown },
) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, tracks: createTracksService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

const cases = [
  { name: "useUpNext", leaf: "upnext", hook: useUpNext, data: upNextFixture },
  { name: "useLyrics", leaf: "lyrics", hook: useLyrics, data: lyricsFixture },
  { name: "useRelated", leaf: "related", hook: useRelated, data: relatedFixture },
  { name: "useCredits", leaf: "credits", hook: useCredits, data: creditsFixture },
] as const;

describe.each(cases)("$name", ({ leaf, hook, data }) => {
  async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"], id = "t1") {
    const rendered = await renderHook(() => hook(id), { wrapper });
    await waitFor(() => {
      expect(rendered.result.current.isFetching).toBe(false);
    });
    return rendered;
  }

  it("returns the data", async () => {
    const { send, wrapper } = setup(data, {});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual(data);
    expect(send.mock.calls[0]?.[0].url).toBe(`test://api/tracks/t1/${leaf}`);
  });

  it("keeps it fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = setup(data, { "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats a no-store result as stale", async () => {
    const { send, wrapper } = setup(data, { "cache-control": "no-store" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("keeps one cache entry per track", async () => {
    const { send, wrapper } = setup(data, { "cache-control": "max-age=60" });
    await mountAndSettle(wrapper, "t1");
    await mountAndSettle(wrapper, "t2");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].url).toBe(`test://api/tracks/t2/${leaf}`);
  });

  it("throws an OutcomeError carrying track_not_found", async () => {
    const { wrapper } = setup(
      undefined,
      {},
      { status: 404, body: { ok: false, reason: "track_not_found" } },
    );
    const { result } = await mountAndSettle(wrapper);
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "track_not_found",
    });
  });
});

describe("useUpNext reading without refetching on mount", () => {
  it("does not refetch a stale outcome on a mount that reads without refetching", async () => {
    const { send, wrapper } = setup(upNextFixture, { "cache-control": "max-age=60" });
    const first = await renderHook(() => useUpNext("t1"), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isFetching).toBe(false);
    });
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    const reading = await renderHook(() => useUpNext("t1", { refetchOnMount: false }), {
      wrapper,
    });
    await waitFor(() => {
      expect(reading.result.current.data).toEqual(upNextFixture);
    });
    expect(reading.result.current.isFetching).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("still fetches on a reading mount when nothing is cached", async () => {
    const { send, wrapper } = setup(upNextFixture, { "cache-control": "max-age=60" });
    const { result } = await renderHook(() => useUpNext("t1", { refetchOnMount: false }), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current.data).toEqual(upNextFixture);
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
