// apps/mobile/test/queries/useAlbum.test.tsx
//
// Tests for the album query hook.
//
// Tested:
// - useAlbum
//
// What is covered:
// - the album unwrapped from the outcome, cache time from Cache-Control, OutcomeError carrying invalid_request
//
// Run with: pnpm --filter @beatly/mobile test -- useAlbum
//
// SEE: apps/mobile/src/queries/useAlbum.ts

import { createAlbumService, createHttpClient } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useAlbum } from "../../src/queries/useAlbum.ts";
import { albumFixture, makeAuth, makeCore, makeLog, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data: albumFixture }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, album: createAlbumService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useAlbum("MPREb_1"), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useAlbum", () => {
  it("returns the album", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual(albumFixture);
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/album/MPREb_1");
  });

  it("keeps an album fresh for its Cache-Control max-age", async () => {
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

  it("throws an OutcomeError carrying invalid_request", async () => {
    const { wrapper } = setup({}, { status: 422, body: { ok: false, reason: "invalid_request" } });
    const { result } = await mountAndSettle(wrapper);
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "invalid_request",
    });
  });
});
