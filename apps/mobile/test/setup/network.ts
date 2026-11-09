// apps/mobile/test/setup/network.ts
//
// Test setup: fakes @react-native-community/netinfo at the module so no test reads the real connection.
//
// Tested:
// - Not a test itself; loaded by the jest `setupFiles` of apps/mobile
//
// What is covered:
// apps/mobile/test
//
import { jest } from "@jest/globals";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    configure: () => undefined,
    addEventListener: () => () => undefined,
    fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
  },
}));
