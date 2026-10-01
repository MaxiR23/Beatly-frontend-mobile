// apps/mobile/test/adapters/log.test.ts
//
// Tests for the log adapter.
//
// Tested:
// - createLogAdapter
//
// What is covered:
// - debug writes to the console in development and is silent otherwise
// - with no argument the dev flag defaults to the __DEV__ global
// - info, warn and error write in both modes
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/log
//
// SEE: apps/mobile/src/adapters/log.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { createLogAdapter } from "../../src/adapters/log.ts";

describe("createLogAdapter", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes debug to the console in development", () => {
    const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined);
    createLogAdapter(true).debug("stream.resolved", { platform: "ios" });
    expect(debug).toHaveBeenCalledWith("stream.resolved", { platform: "ios" });
  });

  it("drops debug outside development", () => {
    const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined);
    createLogAdapter(false).debug("stream.resolved", { platform: "ios" });
    expect(debug).not.toHaveBeenCalled();
  });

  it("defaults to the __DEV__ global when no argument is given", () => {
    const original: unknown = Reflect.get(globalThis, "__DEV__");
    const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined);
    try {
      Reflect.set(globalThis, "__DEV__", true);
      createLogAdapter().debug("dev.on");
      expect(debug).toHaveBeenCalledTimes(1);
      expect(debug).toHaveBeenCalledWith("dev.on");
      Reflect.set(globalThis, "__DEV__", false);
      createLogAdapter().debug("dev.off");
      expect(debug).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.set(globalThis, "__DEV__", original);
    }
  });

  it("writes info, warn and error in both modes", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    createLogAdapter(false).warn("stream.unplayable");
    createLogAdapter(true).error("boot.failed", { step: 1 });
    createLogAdapter(false).info("app.started");
    expect(warn).toHaveBeenCalledWith("stream.unplayable");
    expect(error).toHaveBeenCalledWith("boot.failed", { step: 1 });
    expect(info).toHaveBeenCalledWith("app.started");
  });
});
