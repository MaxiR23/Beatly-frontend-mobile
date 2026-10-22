// apps/mobile/test/app/_layout.test.tsx
//
// Tests for the session gate and the splash of the root layout.
//
// Tested:
// - the root layout's Stack.Protected groups and its splash hide
//
// What is covered:
// - unknown mounts only the placeholder and keeps the splash; signed out mounts login and sign up only; signed in mounts tabs and player only
// - the splash hides only once the screen matching the status is committed (a mount registry the hideAsync mock reads), from the stored status and from a change event
// - signing in lands on home, signing out lands on login
//
// Run with: pnpm --filter @beatly/mobile test -- app/_layout
//
// SEE: apps/mobile/app/_layout.tsx, apps/mobile/app/session-pending.tsx

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { router } from "expo-router";
import { act, renderRouter, screen } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import { useLayoutEffect, type ComponentType } from "react";

import type * as HomeModule from "../../src/screens/home/HomeScreen.tsx";
import type * as LoginModule from "../../src/screens/login/LoginScreen.tsx";
import type * as PlayerModule from "../../src/screens/player/PlayerScreen.tsx";
import type * as PendingModule from "../../src/screens/sessionPending/SessionPendingScreen.tsx";
import type * as SignUpModule from "../../src/screens/signUp/SignUpScreen.tsx";
import { installCore } from "../helpers/routeCore.ts";

jest.mock("../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
const mockCore = installCore();

const mockMounted = new Set<string>();

function mockTracked(id: string, Screen: ComponentType) {
  return function Tracked() {
    useLayoutEffect(() => {
      mockMounted.add(id);
      return () => {
        mockMounted.delete(id);
      };
    }, []);
    return <Screen />;
  };
}

jest.mock("../../src/screens/home/HomeScreen.tsx", () => {
  const actual = jest.requireActual<typeof HomeModule>("../../src/screens/home/HomeScreen.tsx");
  return { ...actual, HomeScreen: mockTracked("home", actual.HomeScreen) };
});
jest.mock("../../src/screens/login/LoginScreen.tsx", () => {
  const actual = jest.requireActual<typeof LoginModule>("../../src/screens/login/LoginScreen.tsx");
  return { ...actual, LoginScreen: mockTracked("login", actual.LoginScreen) };
});
jest.mock("../../src/screens/signUp/SignUpScreen.tsx", () => {
  const actual = jest.requireActual<typeof SignUpModule>(
    "../../src/screens/signUp/SignUpScreen.tsx",
  );
  return { ...actual, SignUpScreen: mockTracked("signUp", actual.SignUpScreen) };
});
jest.mock("../../src/screens/player/PlayerScreen.tsx", () => {
  const actual = jest.requireActual<typeof PlayerModule>(
    "../../src/screens/player/PlayerScreen.tsx",
  );
  return { ...actual, PlayerScreen: mockTracked("player", actual.PlayerScreen) };
});
jest.mock("../../src/screens/sessionPending/SessionPendingScreen.tsx", () => {
  const actual = jest.requireActual<typeof PendingModule>(
    "../../src/screens/sessionPending/SessionPendingScreen.tsx",
  );
  return {
    ...actual,
    SessionPendingScreen: mockTracked("sessionPending", actual.SessionPendingScreen),
  };
});

const drawnAtHide: string[][] = [];

beforeEach(() => {
  drawnAtHide.length = 0;
  mockMounted.clear();
  jest.mocked(SplashScreen.hideAsync).mockClear();
  jest.mocked(SplashScreen.hideAsync).mockImplementation(() => {
    drawnAtHide.push([...mockMounted]);
    return Promise.resolve();
  });
});

describe("the root layout session gate", () => {
  it("mounts only the placeholder and keeps the splash while the status is unknown", async () => {
    mockCore.set("unknown");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("sessionPending")).toBeTruthy();
    for (const id of ["login", "signUp", "home", "player"])
      expect(screen.queryByTestId(id)).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it.each(["/login", "/sign-up"])(
    "keeps login and sign up out while unknown when the link is %s",
    async (initialUrl) => {
      mockCore.set("unknown");
      await renderRouter("app", { initialUrl });
      expect(await screen.findByTestId("sessionPending")).toBeTruthy();
      expect(screen.queryByTestId("login")).toBeNull();
      expect(screen.queryByTestId("signUp")).toBeNull();
    },
  );

  it("mounts login and not the tabs or the player when signed out", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("login")).toBeTruthy();
    for (const id of ["home", "player", "sessionPending"])
      expect(screen.queryByTestId(id)).toBeNull();
    await act(() => {
      router.push("/sign-up");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("signUp")).toBeTruthy();
    await act(() => {
      router.push("/player");
      return Promise.resolve();
    });
    expect(screen.queryByTestId("player")).toBeNull();
  });

  it("mounts the tabs and not login or sign up when signed in", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("home")).toBeTruthy();
    for (const id of ["login", "signUp", "sessionPending"])
      expect(screen.queryByTestId(id)).toBeNull();
    await act(() => {
      router.push("/player");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("player")).toBeTruthy();
  });

  it("hides the splash only once home is in the tree", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("home");
    expect(first).not.toContain("sessionPending");
    expect(first).not.toContain("login");
  });

  it("hides the splash only once login is in the tree", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("login");
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("login");
    expect(first).not.toContain("sessionPending");
    expect(first).not.toContain("home");
  });

  it("hides the splash after a sign-in event resolves the pending status", async () => {
    mockCore.set("unknown");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("sessionPending");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    await screen.findByTestId("home");
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("home");
    expect(first).not.toContain("sessionPending");
  });

  it("lands on login when signing out", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(() => {
      mockCore.emit("signed_out");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("login")).toBeTruthy();
    expect(screen.queryByTestId("home")).toBeNull();
  });

  it("lands on home when signing in", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("login");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(screen.queryByTestId("login")).toBeNull();
  });
});
