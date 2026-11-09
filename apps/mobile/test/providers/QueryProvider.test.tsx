// apps/mobile/test/providers/QueryProvider.test.tsx
//
// Tests for the QueryProvider.
//
// Tested:
// - QueryProvider
//
// What is covered:
// - mounting connects the network adapter to the onlineManager; the adapter's listener drives it
// - unmounting disconnects it
//
// Run with: pnpm --filter @beatly/mobile test -- QueryProvider
//
// SEE: apps/mobile/src/providers/QueryProvider.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { subscribeToConnection } from "../../src/adapters/network.ts";
import { QueryProvider } from "../../src/providers/QueryProvider.tsx";

jest.mock("../../src/adapters/network.ts", () => ({
  subscribeToConnection: jest.fn(),
}));

const subscribe = jest.mocked(subscribeToConnection);

afterEach(() => {
  onlineManager.setOnline(true);
  subscribe.mockReset();
});

describe("QueryProvider", () => {
  it("connects the network adapter to the onlineManager and disconnects on unmount", async () => {
    const unsubscribe = jest.fn();
    let listener: (online: boolean) => void = () => undefined;
    subscribe.mockImplementation((next) => {
      listener = next;
      return unsubscribe;
    });
    const view = await render(
      <QueryProvider>
        <Text>child</Text>
      </QueryProvider>,
    );
    expect(subscribe).toHaveBeenCalledTimes(1);
    listener(false);
    expect(onlineManager.isOnline()).toBe(false);
    await view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
