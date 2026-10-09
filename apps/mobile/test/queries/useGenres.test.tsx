// apps/mobile/test/queries/useGenres.test.tsx
//
// Tests for the genres query hooks.
//
// Tested:
// - useGenres
// - useGenrePlaylists
// - useGenreCategories
//
// What is covered:
// - items unwrapped from the page, cache time from Cache-Control, OutcomeError on a failure
//
// Run with: pnpm --filter @beatly/mobile test -- useGenres
//
// SEE: apps/mobile/src/queries/useGenres.ts

import { createGenresService, createHttpClient } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useGenreCategories, useGenrePlaylists, useGenres } from "../../src/queries/useGenres.ts";
import {
  genreFixture,
  genrePlaylistFixture,
  makeAuth,
  makeCore,
  makeLog,
  Wrapper,
} from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 50, next_cursor: null, has_more: false, total: 1 };

const cases = [
  {
    name: "genres",
    item: genreFixture,
    failure: "upstream_error",
    useHook: () => useGenres(),
  },
  {
    name: "a genre's playlists",
    item: genrePlaylistFixture,
    failure: "genre_not_found",
    useHook: () => useGenrePlaylists("pop"),
  },
  {
    name: "a genre's categories",
    item: "Hits",
    failure: "genre_not_found",
    useHook: () => useGenreCategories("pop"),
  },
] as const;

function setup(
  item: unknown,
  headers: Record<string, string>,
  response?: { status: number; body: unknown },
) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data: { items: [item], page: PAGE } }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, genres: createGenresService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(
  useHook: () => { isFetching: boolean; data: unknown; error: unknown },
  wrapper: ReturnType<typeof setup>["wrapper"],
) {
  const rendered = await renderHook(useHook, { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe.each(cases)("$name hook", ({ name, item, failure, useHook }) => {
  it("returns the items unwrapped from the page", async () => {
    const { wrapper } = setup(item, {});
    const { result } = await mountAndSettle(useHook, wrapper);
    expect(result.current.data).toEqual([item]);
  });

  it(`keeps ${name} fresh for their Cache-Control max-age`, async () => {
    const { send, wrapper } = setup(item, { "cache-control": "max-age=60" });
    await mountAndSettle(useHook, wrapper);
    await mountAndSettle(useHook, wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(useHook, wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it(`treats ${name}'s no-store as stale`, async () => {
    const { send, wrapper } = setup(item, { "cache-control": "no-store" });
    await mountAndSettle(useHook, wrapper);
    await mountAndSettle(useHook, wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("throws an OutcomeError carrying the api failure", async () => {
    const { wrapper } = setup(item, {}, { status: 502, body: { ok: false, reason: failure } });
    const { result } = await mountAndSettle(useHook, wrapper);
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: failure,
    });
  });
});
