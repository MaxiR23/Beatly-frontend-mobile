// apps/mobile/test/providers/SessionProvider.test.tsx
//
// Tests for the session provider.
//
// Tested:
// - SessionProvider, useSession
//
// What is covered:
// - the status is unknown, then the stored one; events win; sign out clears the query cache
//
// Run with: pnpm --filter @beatly/mobile test -- SessionProvider
//
// SEE: apps/mobile/src/providers/SessionProvider.tsx

import type { AuthChange, AuthStatus } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { SessionProvider, useSession } from "../../src/providers/SessionProvider.tsx";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { makeAuth, makeCore, Wrapper } from "../helpers/core.tsx";

function Probe() {
  return <Text testID="status">{useSession().status}</Text>;
}

function setup(getStatus: () => Promise<AuthStatus>) {
  let emit: (change: AuthChange) => void = () => undefined;
  const auth = makeAuth({
    getStatus: jest.fn(getStatus),
    onAuthChange: jest.fn((listener: (change: AuthChange) => void) => {
      emit = listener;
      return () => undefined;
    }),
  });
  const { core, log } = makeCore({ auth });
  const client = createQueryClient();
  return {
    core,
    client,
    emit: (change: AuthChange) => {
      emit(change);
    },
    log,
  };
}

async function mount(s: ReturnType<typeof setup>) {
  await render(
    <Wrapper core={s.core} client={s.client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </Wrapper>,
  );
}

describe("SessionProvider", () => {
  it("is unknown and then the stored status", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    await mount(s);
    expect(await screen.findByText("signed_in")).toBeTruthy();
  });

  it("lets a change event override the status", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    await mount(s);
    await screen.findByText("signed_in");
    await act(() => {
      s.emit({ status: "signed_out" });
    });
    expect(screen.getByTestId("status").props.children).toBe("signed_out");
  });

  it("does not let a late getStatus override an event", async () => {
    let resolve: (status: AuthStatus) => void = () => undefined;
    const s = setup(
      () =>
        new Promise<AuthStatus>((r) => {
          resolve = r;
        }),
    );
    await mount(s);
    await act(() => {
      s.emit({ status: "signed_out" });
    });
    await act(() => {
      resolve("signed_in");
    });
    expect(screen.getByTestId("status").props.children).toBe("signed_out");
  });

  it("clears the query cache on a signed_in to signed_out change", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    s.client.setQueryData(["seed"], "value");
    await mount(s);
    await screen.findByText("signed_in");
    expect(s.client.getQueryData(["seed"])).toBe("value");
    await act(() => {
      s.emit({ status: "signed_out" });
    });
    expect(s.client.getQueryData(["seed"])).toBeUndefined();
  });

  it("logs and stays unknown when the stored status is unreadable", async () => {
    const s = setup(() => Promise.reject(new Error("store")));
    await mount(s);
    await act(() => Promise.resolve());
    expect(s.log.warn).toHaveBeenCalledWith("session.status_unreadable");
    expect(screen.getByTestId("status").props.children).toBe("unknown");
  });
});
