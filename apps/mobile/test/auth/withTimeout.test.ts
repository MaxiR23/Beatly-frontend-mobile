// apps/mobile/test/auth/withTimeout.test.ts
//
// Tests for the timeout helper.
//
// Tested:
// - withTimeout
//
// What is covered:
// - the work wins, the timer wins, the timer is cleared, a late rejection stays handled
//
// Run with: pnpm --filter @beatly/mobile test -- withTimeout
//
// SEE: apps/mobile/src/auth/withTimeout.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { withTimeout } from "../../src/auth/withTimeout.ts";

afterEach(() => {
  jest.useRealTimers();
});

describe("withTimeout", () => {
  it("resolves the work's value when it settles first", async () => {
    jest.useFakeTimers();
    expect(await withTimeout(Promise.resolve("done"), 1000, "late")).toBe("done");
  });

  it("resolves onTimeout after ms when the work never settles", async () => {
    jest.useFakeTimers();
    const pending = withTimeout(new Promise<string>(() => undefined), 1000, "late");
    jest.advanceTimersByTime(1000);
    expect(await pending).toBe("late");
  });

  it("clears the timer when the work settles early", async () => {
    jest.useFakeTimers();
    await withTimeout(Promise.resolve("done"), 1000, "late");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps a late rejection of the abandoned work handled", async () => {
    jest.useFakeTimers();
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);
    let reject: (error: Error) => void = () => undefined;
    const work = new Promise<string>((_resolve, rej) => {
      reject = rej;
    });
    const pending = withTimeout(work, 1000, "late");
    jest.advanceTimersByTime(1000);
    expect(await pending).toBe("late");
    reject(new Error("too late"));
    jest.useRealTimers();
    await new Promise((resolve) => setImmediate(resolve));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
