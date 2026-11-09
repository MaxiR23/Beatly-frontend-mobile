// apps/mobile/test/queries/onlineManager.test.ts
//
// Tests for the connection wiring and the offline guard of the stream resolver.
//
// Tested:
// - listenToConnection
// - resolveOnlyOnline
//
// What is covered:
// - the adapter's listener drives the onlineManager, and the cleanup disconnects it
// - offline, a track start fails at once with network without calling the resolver
// - online, the resolver's result is returned for the same track id
//
// Run with: pnpm --filter @beatly/mobile test -- onlineManager
//
// SEE: apps/mobile/src/queries/onlineManager.ts

import type { StreamResolution, StreamResolver } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";

import { subscribeToConnection } from "../../src/adapters/network.ts";
import { listenToConnection, resolveOnlyOnline } from "../../src/queries/onlineManager.ts";

jest.mock("../../src/adapters/network.ts", () => ({
  subscribeToConnection: jest.fn(),
}));

const subscribe = jest.mocked(subscribeToConnection);

afterEach(() => {
  onlineManager.setOnline(true);
  subscribe.mockReset();
});

describe("listenToConnection", () => {
  it("lets the adapter's listener drive the onlineManager and disconnects on cleanup", () => {
    const unsubscribe = jest.fn();
    let listener: (online: boolean) => void = () => undefined;
    subscribe.mockImplementation((next) => {
      listener = next;
      return unsubscribe;
    });
    const stop = listenToConnection();
    expect(subscribe).toHaveBeenCalledTimes(1);
    listener(false);
    expect(onlineManager.isOnline()).toBe(false);
    listener(true);
    expect(onlineManager.isOnline()).toBe(true);
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("resolveOnlyOnline", () => {
  const resolved: StreamResolution = { kind: "resolved", url: "test://stream" };

  it("fails a track start at once with network while offline", async () => {
    const resolve = jest.fn<StreamResolver["resolve"]>(() => Promise.resolve(resolved));
    onlineManager.setOnline(false);
    const result = await resolveOnlyOnline({ resolve }).resolve("t1");
    expect(resolve).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: "failure", cause: "network" });
  });

  it("delegates to the resolver while online", async () => {
    const resolve = jest.fn<StreamResolver["resolve"]>(() => Promise.resolve(resolved));
    const result = await resolveOnlyOnline({ resolve }).resolve("t1");
    expect(resolve).toHaveBeenCalledWith("t1");
    expect(result).toEqual(resolved);
  });
});
