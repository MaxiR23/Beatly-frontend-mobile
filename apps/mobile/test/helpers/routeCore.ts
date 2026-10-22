// apps/mobile/test/helpers/routeCore.ts
//
// Test helper: a swappable Core for the route tests, whose stored session status a test sets.
//
// Tested:
// - Not a test itself; used by the tests under apps/mobile/test/app
//
// What is covered:
// apps/mobile/test/app, with a pending session status and auth change events
//
import type { AuthPort, AuthStatus } from "@beatly/core";
import { jest } from "@jest/globals";

import type { Core } from "../../src/createCore.ts";
import { makeAuth, makeCore, type MockAuth } from "./core.tsx";

type AuthListener = Parameters<AuthPort["onAuthChange"]>[0];

export function installCore() {
  const holder = { current: makeCore().core };
  const listeners: { current: AuthListener | null } = { current: null };
  return {
    get current(): Core {
      return holder.current;
    },
    set(
      status: AuthStatus | "unknown",
      options: Parameters<typeof makeCore>[0] = {},
      auth: Partial<MockAuth> = {},
    ) {
      const getStatus = jest.fn<AuthPort["getStatus"]>(() =>
        status === "unknown" ? new Promise<AuthStatus>(() => undefined) : Promise.resolve(status),
      );
      const onAuthChange = jest.fn<AuthPort["onAuthChange"]>((listener) => {
        listeners.current = listener;
        return () => undefined;
      });
      holder.current = makeCore({
        ...options,
        auth: makeAuth({ getStatus, onAuthChange, ...auth }),
      }).core;
    },
    emit(status: AuthStatus) {
      listeners.current?.({ status });
    },
  };
}
