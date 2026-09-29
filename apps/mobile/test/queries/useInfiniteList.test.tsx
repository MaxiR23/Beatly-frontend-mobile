// apps/mobile/test/queries/useInfiniteList.test.tsx
//
// Tests for the shared infinite-query hook.
//
// Tested:
// - useInfiniteList
//
// What is covered:
// - pages flattened in order, loadMore, no next page, restart from the first page, OutcomeError
//
// Run with: pnpm --filter @beatly/mobile test -- useInfiniteList
//
// SEE: apps/mobile/src/queries/useInfiniteList.ts

import type { HttpOutcome, PageResult } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { useInfiniteList } from "../../src/queries/useInfiniteList.ts";
import { pageOf } from "../helpers/core.tsx";

type Fetch = (cursor: string | null) => Promise<HttpOutcome<PageResult<number>>>;

async function mount(fetchPage: Fetch) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = await renderHook(() => useInfiniteList({ queryKey: ["list"], fetchPage }), {
    wrapper,
  });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

const twoPages: Fetch = (cursor) =>
  Promise.resolve(
    cursor === null ? pageOf([1, 2], { has_more: true, next_cursor: "c1" }) : pageOf([3]),
  );

describe("useInfiniteList", () => {
  it("flattens the pages in order", async () => {
    const { result } = await mount(twoPages);
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([1, 2, 3]);
    });
  });

  it("loadMore requests the next cursor and appends its items", async () => {
    const fetchPage = jest.fn<Fetch>(twoPages);
    const { result } = await mount(fetchPage);
    expect(result.current.data).toEqual([1, 2]);
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([1, 2, 3]);
    });
    expect(fetchPage).toHaveBeenLastCalledWith("c1");
  });

  it("has no next page when has_more is false", async () => {
    const { result } = await mount(() => Promise.resolve(pageOf([1])));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("loadMore does nothing without a next page", async () => {
    const fetchPage = jest.fn<Fetch>(() => Promise.resolve(pageOf([1])));
    const { result } = await mount(fetchPage);
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("drops the pages before a restart from the first page", async () => {
    const restarted: HttpOutcome<PageResult<number>> = {
      kind: "success",
      maxAgeSeconds: 0,
      data: {
        items: [9],
        page: { limit: 50, next_cursor: null, has_more: false, total: 1 },
        restartedFromFirstPage: true,
      },
    };
    const { result } = await mount((cursor) =>
      Promise.resolve(
        cursor === null ? pageOf([1, 2], { has_more: true, next_cursor: "c1" }) : restarted,
      ),
    );
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([9]);
    });
  });

  it("throws an OutcomeError for a failed page", async () => {
    const { result } = await mount(() =>
      Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    );
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });
});
