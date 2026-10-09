// apps/mobile/test/queries/useAuth.test.tsx
//
// Tests for the sign-out mutation and the recent searches it clears.
//
// Tested:
// - useSignOut
//
// What is covered:
// - a successful sign-out clears the stored recents and drops the cached list
// - a failed sign-out keeps them
// - a failed clear does not fail the sign-out
// - Not applicable: the cache time from Cache-Control, because a mutation has none
//
// Run with: pnpm --filter @beatly/mobile test -- useAuth
//
// SEE: apps/mobile/src/queries/useAuth.ts

import { RECENT_SEARCHES_KEY } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useSignOut } from "../../src/queries/useAuth.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { recentSearchesQueryKey } from "../../src/queries/useRecentSearches.ts";
import { makeCore, memoryStorage, Wrapper } from "../helpers/core.tsx";

const seeded = () => memoryStorage({ [RECENT_SEARCHES_KEY]: JSON.stringify(["b", "a"]) });

function setup(storage = seeded()) {
  const ctx = makeCore({ storage });
  const client = createTestQueryClient();
  client.setQueryData(recentSearchesQueryKey, { kind: "success", data: ["b", "a"] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={ctx.core} client={client}>
      {children}
    </Wrapper>
  );
  return { ctx, client, storage, wrapper };
}

describe("useSignOut", () => {
  it("clears the stored recents and drops the cached list on success", async () => {
    const { client, storage, wrapper } = setup();
    const { result } = await renderHook(() => useSignOut(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(await storage.get(RECENT_SEARCHES_KEY)).toBeNull();
    expect(client.getQueryData(recentSearchesQueryKey)).toBeUndefined();
  });

  it("keeps the recents when the sign-out fails", async () => {
    const { ctx, client, storage, wrapper } = setup();
    ctx.auth.signOut.mockImplementation(() =>
      Promise.resolve({ kind: "failure", reason: "network" } as never),
    );
    const { result } = await renderHook(() => useSignOut(), { wrapper });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync();
    });
    expect(outcome).toMatchObject({ kind: "failure" });
    expect(await storage.get(RECENT_SEARCHES_KEY)).not.toBeNull();
    expect(client.getQueryData(recentSearchesQueryKey)).toBeDefined();
  });

  it("still signs out when the clear fails", async () => {
    const storage = seeded();
    jest.spyOn(storage, "delete").mockRejectedValue(new Error("boom"));
    const { client, wrapper } = setup(storage);
    const { result } = await renderHook(() => useSignOut(), { wrapper });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync();
    });
    expect(outcome).toEqual({ kind: "success" });
    expect(client.getQueryData(recentSearchesQueryKey)).toBeUndefined();
  });
});
