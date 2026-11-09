// apps/mobile/test/adapters/network.test.ts
//
// Tests for the network adapter.
//
// Tested:
// - subscribeToConnection
//
// What is covered:
// - connected and reachable is online; not connected is offline
// - connected with no internet reachable is offline; reachability not known yet counts as online
// - connection not known yet counts as online
// - it returns the library's unsubscribe
// - the reachability probe is left at the library's default: configure is never called
//
// Run with: pnpm --filter @beatly/mobile test -- network
//
// SEE: apps/mobile/src/adapters/network.ts

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import * as network from "../../src/adapters/network.ts";

const { subscribeToConnection } = network;

interface ConnectionState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

const mockAddEventListener = jest.fn<(handler: (state: ConnectionState) => void) => () => void>();
const mockConfigure = jest.fn<() => void>();
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    configure: () => {
      mockConfigure();
    },
    addEventListener: (handler: (state: ConnectionState) => void) => mockAddEventListener(handler),
  },
}));

beforeEach(() => {
  mockAddEventListener.mockReset();
  mockConfigure.mockReset();
});

function connect(state: ConnectionState): boolean[] {
  const heard: boolean[] = [];
  mockAddEventListener.mockImplementation((handler) => {
    handler(state);
    return () => undefined;
  });
  subscribeToConnection((online) => heard.push(online));
  return heard;
}

describe("subscribeToConnection", () => {
  it.each([
    ["connected and reachable", { isConnected: true, isInternetReachable: true }, true],
    ["not connected", { isConnected: false, isInternetReachable: false }, false],
    ["connected with no internet", { isConnected: true, isInternetReachable: false }, false],
    [
      "connected with reachability not known",
      { isConnected: true, isInternetReachable: null },
      true,
    ],
    ["connection not known", { isConnected: null, isInternetReachable: null }, true],
  ] as const)("reports %s", (_name, state, expected) => {
    expect(connect(state)).toEqual([expected]);
  });

  it("returns the library's unsubscribe", () => {
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);
    expect(subscribeToConnection(() => undefined)).toBe(unsubscribe);
  });

  it("never configures the reachability probe, so the library's default stays", () => {
    mockAddEventListener.mockReturnValue(() => undefined);
    subscribeToConnection(() => undefined);
    subscribeToConnection(() => undefined);
    expect(mockConfigure).not.toHaveBeenCalled();
  });
});
