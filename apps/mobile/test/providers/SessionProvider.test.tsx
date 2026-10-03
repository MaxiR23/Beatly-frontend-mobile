// apps/mobile/test/providers/SessionProvider.test.tsx
//
// Tests for the session provider.
//
// Tested:
// - SessionProvider, useSession
//
// What is covered:
// - the status is unknown, then the stored one; events win; sign out clears the query cache, stops playback and clears the likes mirror
// - the likes mirror syncs on a stored signed in session, on a sign in and on the return to the foreground (not while signed out); a confirmed like invalidates the library and the liked playlist
//
// Run with: pnpm --filter @beatly/mobile test -- SessionProvider
//
// SEE: apps/mobile/src/providers/SessionProvider.tsx

import type { AuthChange, AuthStatus } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { AppState, Text, type AppStateStatus } from "react-native";

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
  const { core, emitLikeConfirmed, likes, log, playback, player } = makeCore({ auth });
  const client = createQueryClient();
  return {
    core,
    client,
    playback,
    player,
    likes,
    emitLikeConfirmed,
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

  it("stops playback on a signed_in to signed_out change", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    await mount(s);
    await screen.findByText("signed_in");
    await act(async () => {
      await s.playback.playList(
        [
          {
            trackId: "t1",
            title: "Song",
            artists: [],
            album: null,
            albumId: null,
            coverUrl: null,
            durationSeconds: 100,
          },
        ],
        0,
        { kind: "album", id: "a1", name: "Album" },
      );
    });
    expect(s.playback.getState().current).not.toBeNull();
    await act(() => {
      s.emit({ status: "signed_out" });
    });
    expect(s.playback.getState().current).toBeNull();
    expect(s.player.port.unload).toHaveBeenCalled();
  });

  it("logs and stays unknown when the stored status is unreadable", async () => {
    const s = setup(() => Promise.reject(new Error("store")));
    await mount(s);
    await act(() => Promise.resolve());
    expect(s.log.warn).toHaveBeenCalledWith("session.status_unreadable");
    expect(screen.getByTestId("status").props.children).toBe("unknown");
  });

  it("syncs the likes mirror when the stored session is signed in", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    await mount(s);
    await screen.findByText("signed_in");
    expect(s.likes.sync).toHaveBeenCalledTimes(1);
  });

  it("does not sync the likes mirror when the stored session is signed out", async () => {
    const s = setup(() => Promise.resolve("signed_out"));
    await mount(s);
    await screen.findByText("signed_out");
    expect(s.likes.sync).not.toHaveBeenCalled();
  });

  it("syncs the likes mirror on a signed_out to signed_in change", async () => {
    const s = setup(() => Promise.resolve("signed_out"));
    await mount(s);
    await screen.findByText("signed_out");
    await act(() => {
      s.emit({ status: "signed_in" });
    });
    expect(s.likes.sync).toHaveBeenCalledTimes(1);
  });

  it("syncs the likes mirror when the app returns to the foreground", async () => {
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      onChange = listener;
      return { remove: () => undefined };
    });
    const s = setup(() => Promise.resolve("signed_in"));
    await mount(s);
    await screen.findByText("signed_in");
    expect(s.likes.sync).toHaveBeenCalledTimes(1);
    await act(() => {
      onChange("background");
      onChange("active");
    });
    expect(s.likes.sync).toHaveBeenCalledTimes(2);
  });

  it("does not sync on the foreground while signed out", async () => {
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      onChange = listener;
      return { remove: () => undefined };
    });
    const s = setup(() => Promise.resolve("signed_out"));
    await mount(s);
    await screen.findByText("signed_out");
    await act(() => {
      onChange("active");
    });
    expect(s.likes.sync).not.toHaveBeenCalled();
  });

  it("clears the likes mirror on a signed_in to signed_out change", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    await mount(s);
    await screen.findByText("signed_in");
    expect(s.likes.clear).not.toHaveBeenCalled();
    await act(() => {
      s.emit({ status: "signed_out" });
    });
    expect(s.likes.clear).toHaveBeenCalledTimes(1);
  });

  it("invalidates the library and liked playlist queries when a like is confirmed", async () => {
    const s = setup(() => Promise.resolve("signed_in"));
    s.client.setQueryData(["library"], "entries");
    s.client.setQueryData(["playlist", "liked", "liked"], "header");
    s.client.setQueryData(["playlist", "user", "p1"], "other");
    await mount(s);
    await screen.findByText("signed_in");
    await act(() => {
      s.emitLikeConfirmed();
    });
    expect(s.client.getQueryState(["library"])?.isInvalidated).toBe(true);
    expect(s.client.getQueryState(["playlist", "liked", "liked"])?.isInvalidated).toBe(true);
    expect(s.client.getQueryState(["playlist", "user", "p1"])?.isInvalidated).toBe(false);
  });
});
