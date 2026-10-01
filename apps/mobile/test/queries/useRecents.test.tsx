// apps/mobile/test/queries/useRecents.test.tsx
//
// Tests for the recents query hook.
//
// Tested:
// - useRecents
// - useRegisterRecent
//
// What is covered:
// - items unwrapped from the page, cache time from Cache-Control, OutcomeError on a failure
// - a registered recent refetches the recents and comes first; a failed registration is logged and refetches nothing
//
// Run with: pnpm --filter @beatly/mobile test -- useRecents
//
// SEE: apps/mobile/src/queries/useRecents.ts

import { createActivityService, createHttpClient } from "@beatly/core";
import type { HttpPort, RecentEntity, RecentInput } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { useRecents, useRegisterRecent } from "../../src/queries/useRecents.ts";
import { makeAuth, makeCore, makeLog, recentFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 30, next_cursor: null, has_more: false, total: 1 };

function setup(
  headers: Record<string, string>,
  response?: { status: number; body: unknown },
  post?: { status: number; body: unknown },
) {
  let getBody: unknown = { ok: true, data: { items: [recentFixture], page: PAGE } };
  const send = jest.fn<HttpPort["send"]>((request) => {
    if (request.method === "POST") {
      return Promise.resolve({
        status: post?.status ?? 200,
        headers: {},
        body: JSON.stringify(post?.body ?? { ok: true, data: recentFixture }),
      });
    }
    return Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? getBody),
    });
  });
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
  return {
    send,
    wrapper,
    log,
    answerNextGet: (items: RecentEntity[]) => {
      getBody = { ok: true, data: { items, page: PAGE } };
    },
  };
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

describe("useRegisterRecent", () => {
  const albumInput: RecentInput = {
    entity_type: "album",
    entity_id: "a2",
    metadata: { title: "New album", subtitle: "New artist", thumbnail_url: "test://img/n" },
  };

  it("puts the registered entity first in the recents", async () => {
    const { send, wrapper, answerNextGet } = setup({ "cache-control": "private, no-cache" });
    const rendered = await renderHook(
      () => ({ recents: useRecents(), register: useRegisterRecent() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(rendered.result.current.recents.data).toEqual([recentFixture]);
    });
    const registered: RecentEntity = {
      entity_type: "album",
      entity_id: "a2",
      played_at: "2026-02-01T00:00:00Z",
      metadata: albumInput.metadata,
    };
    answerNextGet([registered, recentFixture]);
    await act(async () => {
      rendered.result.current.register.mutate(albumInput);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(rendered.result.current.recents.data?.[0]).toEqual(registered);
    });
    const post = send.mock.calls.map(([request]) => request).find((r) => r.method === "POST");
    expect(post?.url).toBe("test://api/recents");
    expect(JSON.parse(post?.body ?? "null")).toEqual(albumInput);
  });

  it("logs a failed registration and keeps the recents", async () => {
    const { send, wrapper, log } = setup({ "cache-control": "private, no-cache" }, undefined, {
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    });
    const rendered = await renderHook(
      () => ({ recents: useRecents(), register: useRegisterRecent() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(rendered.result.current.recents.data).toEqual([recentFixture]);
    });
    await act(async () => {
      rendered.result.current.register.mutate(albumInput);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(log.warn).toHaveBeenCalledWith("recents.register_failed", {
        entityType: "album",
        detail: "upstream_error",
      });
    });
    expect(rendered.result.current.recents.data).toEqual([recentFixture]);
    expect(send.mock.calls.filter(([request]) => request.method === "GET")).toHaveLength(1);
  });
});
