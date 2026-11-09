// apps/mobile/test/queries/failureCause.test.ts
//
// Tests for the mapping from a failure to the cause an error state draws.
//
// Tested:
// - failureCauseOf
// - queryFailure
// - playbackFailureCause
// - authFailureCause
//
// What is covered:
// - every transport cause, the api reasons (upstream_timeout is slow, the rest ours), a storage failure and a plain error
// - a loading query keeps the loading state; a paused one with nothing loaded is offline; an error maps by its outcome; success and a disabled query are no failure
// - several queries: loading wins over an error, an error wins over a paused one
// - online with the backend not answering: the cause is server and no offline strip shows
// - the five playback failures and none; the auth failure by connection
//
// Run with: pnpm --filter @beatly/mobile test -- failureCause
//
// SEE: apps/mobile/src/queries/failureCause.ts

import type { PlaybackFailure, TransportCause } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import {
  authFailureCause,
  failureCauseOf,
  playbackFailureCause,
  queryFailure,
} from "../../src/queries/failureCause.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { bottomStatusOf } from "../../src/screens/connection/bottomStatus.ts";

const transport = (cause: TransportCause) => new OutcomeError({ kind: "transport_failure", cause });
const api = (reason: string) => new OutcomeError({ kind: "api_failure", reason });

const idle = { isPending: false, isFetching: false, isPaused: false, isError: false, error: null };
const loading = { ...idle, isPending: true, isFetching: true };
const paused = { ...idle, isPending: true, isPaused: true };
const errored = (error: unknown) => ({ ...idle, isError: true, error });
const disabled = { ...idle, isPending: true };

describe("failureCauseOf", () => {
  it.each([
    ["network", "offline"],
    ["timeout", "slow"],
    ["schema", "server"],
    ["auth", "server"],
  ] as const)("maps the %s transport cause to %s", (cause, expected) => {
    expect(failureCauseOf(transport(cause))).toBe(expected);
  });

  it("maps upstream_timeout to slow", () => {
    expect(failureCauseOf(api("upstream_timeout"))).toBe("slow");
  });

  it.each(["internal_error", "upstream_error", "unauthorized", "something_new"])(
    "maps the %s reason to server",
    (reason) => {
      expect(failureCauseOf(api(reason))).toBe("server");
    },
  );

  it.each(["read", "write"] as const)("maps a storage %s failure to server", (cause) => {
    expect(failureCauseOf(new OutcomeError({ kind: "storage_failure", cause }))).toBe("server");
  });

  it("maps an error that is not an OutcomeError to server", () => {
    expect(failureCauseOf(new Error("boom"))).toBe("server");
    expect(failureCauseOf("boom")).toBe("server");
  });
});

describe("queryFailure", () => {
  it("is null while the query is loading", () => {
    expect(queryFailure(loading)).toBeNull();
  });

  it("is offline for a paused query with nothing loaded", () => {
    expect(queryFailure(paused)).toBe("offline");
  });

  it("maps an error by its outcome, also while a refetch is fetching", () => {
    expect(queryFailure(errored(transport("timeout")))).toBe("slow");
    expect(queryFailure({ ...errored(transport("network")), isFetching: true })).toBe("offline");
  });

  it("is null for a success, also with a paused refetch", () => {
    expect(queryFailure(idle)).toBeNull();
    expect(queryFailure({ ...idle, isPaused: true })).toBeNull();
  });

  it("ignores a disabled query", () => {
    expect(queryFailure(disabled)).toBeNull();
  });

  it("is null when one query is loading and another failed", () => {
    expect(queryFailure(loading, errored(transport("network")))).toBeNull();
  });

  it("gives the errored query's cause over a paused one", () => {
    expect(queryFailure(paused, errored(transport("timeout")))).toBe("slow");
  });
});

describe("playbackFailureCause", () => {
  it.each<[PlaybackFailure | null, string]>([
    ["network", "offline"],
    ["timeout", "slow"],
    ["unplayable", "server"],
    ["invalid_response", "server"],
    ["playback", "server"],
    [null, "server"],
  ])("maps %s to %s", (failure, expected) => {
    expect(playbackFailureCause(failure)).toBe(expected);
  });
});

describe("authFailureCause", () => {
  it("is offline when the device is offline and server otherwise", () => {
    expect(authFailureCause(false)).toBe("offline");
    expect(authFailureCause(true)).toBe("server");
  });
});

describe("a backend outage while the phone is online", () => {
  it.each([
    ["a server error reason", api("internal_error")],
    ["a body that fails the schema", transport("schema")],
  ])("draws the server cause and no offline strip for %s", (_name, error) => {
    const online = true;
    expect(queryFailure(errored(error))).toBe("server");
    expect(bottomStatusOf(online, null)).toBeNull();
  });
});
