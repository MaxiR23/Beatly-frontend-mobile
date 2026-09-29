// apps/mobile/test/helpers/routeCore.ts
//
// Test helper: a swappable Core for the route tests, whose stored session status a test sets.
//
// Tested:
// - Not a test itself; used by the tests under apps/mobile/test/app
//
// What is covered:
// apps/mobile/test/app
//
import type { AuthStatus } from "@beatly/core";
import { jest } from "@jest/globals";

import type { Core } from "../../src/createCore.ts";
import { makeAuth, makeCore } from "./core.tsx";

export function installCore() {
  const holder = { current: makeCore().core };
  return {
    get current(): Core {
      return holder.current;
    },
    set(status: AuthStatus, options: Parameters<typeof makeCore>[0] = {}) {
      const auth = makeAuth({ getStatus: jest.fn(() => Promise.resolve(status)) });
      holder.current = makeCore({ ...options, auth }).core;
    },
  };
}
