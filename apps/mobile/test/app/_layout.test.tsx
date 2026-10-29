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
// - a cold deep link to a tab route is kept while unknown: opened over the tab's base with a session, or after signing in from login; used once; the splash hides only with the target drawn
// - a cold /login is not kept
// - a cold unknown link keeps the splash while unknown (the router's built-in not-found never mounts) and lands where / lands
//
// Run with: pnpm --filter @beatly/mobile test -- app/_layout
//
// SEE: apps/mobile/app/_layout.tsx, apps/mobile/app/session-pending.tsx, apps/mobile/src/screens/album/AlbumScreen.tsx, apps/mobile/app/+not-found.tsx

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type * as Expo from "expo";
import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import { useLayoutEffect, type ComponentType } from "react";

import type * as AlbumModule from "../../src/screens/album/AlbumScreen.tsx";
import type * as HomeModule from "../../src/screens/home/HomeScreen.tsx";
import type * as LoginModule from "../../src/screens/login/LoginScreen.tsx";
import type * as PlayerModule from "../../src/screens/player/PlayerScreen.tsx";
import type * as PendingModule from "../../src/screens/sessionPending/SessionPendingScreen.tsx";
import type * as SignUpModule from "../../src/screens/signUp/SignUpScreen.tsx";
import { resources } from "../../src/i18n/resources.ts";
import { installCore } from "../helpers/routeCore.ts";

jest.mock("../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo", () => {
  const actual = jest.requireActual<typeof Expo>("expo");
  const splash = {
    hide: jest.fn(),
    hideAsync: jest.fn(() => Promise.resolve()),
    preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
    internalPreventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
    internalMaybeHideAsync: jest.fn(() => Promise.resolve(true)),
  };
  return {
    ...actual,
    // Same as test/setup/nativeMenu.ts for ExpoUI; one shared splash module so the router's own hide is visible.
    requireOptionalNativeModule: (name: string) =>
      name === "ExpoUI"
        ? null
        : name === "ExpoSplashScreen"
          ? splash
          : actual.requireOptionalNativeModule<object>(name),
  };
});
// The router's splash module: hide() is what its built-in not-found screen calls on mount.
const routerSplash = () =>
  jest
    .requireMock<{ requireOptionalNativeModule: (name: string) => { hide: jest.Mock } }>("expo")
    .requireOptionalNativeModule("ExpoSplashScreen");
const mockCore = installCore();

const mockMounted = new Set<string>();
const everMounted = new Set<string>();

function mockTracked(id: string, Screen: ComponentType) {
  return function Tracked() {
    useLayoutEffect(() => {
      mockMounted.add(id);
      everMounted.add(id);
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
jest.mock("../../src/screens/album/AlbumScreen.tsx", () => {
  const actual = jest.requireActual<typeof AlbumModule>("../../src/screens/album/AlbumScreen.tsx");
  return { ...actual, AlbumScreen: mockTracked("album", actual.AlbumScreen) };
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
  routerSplash().hide.mockClear();
  mockMounted.clear();
  everMounted.clear();
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

  it("keeps the splash on a cold unknown link until the session check finishes", async () => {
    mockCore.set("unknown");
    await renderRouter("app", { initialUrl: "/no-such-route" });
    await act(() => Promise.resolve());
    expect(routerSplash().hide).not.toHaveBeenCalled();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    expect(await screen.findByTestId("sessionPending")).toBeTruthy();
  });

  it("lands a cold unknown link where / lands once the session is known, the splash hiding with that screen drawn", async () => {
    mockCore.set("unknown");
    await renderRouter("app", { initialUrl: "/no-such-route" });
    await screen.findByTestId("sessionPending");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    await screen.findByTestId("home");
    expect(routerSplash().hide).not.toHaveBeenCalled();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("home");
    expect(first).not.toContain("sessionPending");
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

  it("opens a cold deep link with a session, the splash hiding only once the album is drawn", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/album/MPREb_1" });
    expect(await screen.findByTestId("album")).toBeTruthy();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("album");
    expect(first).not.toContain("sessionPending");
    expect(first).not.toContain("login");
    expect(everMounted.has("login")).toBe(false);
    expect(everMounted.has("signUp")).toBe(false);
  });

  it("shows login for a cold deep link without a session and opens the link after signing in", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/album/MPREb_1" });
    expect(await screen.findByTestId("login")).toBeTruthy();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("login");
    expect(first).not.toContain("album");
    expect(first).not.toContain("home");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect(router.canGoBack()).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: resources.en.album.back }));
    expect(await screen.findByTestId("home")).toBeTruthy();
  });

  it("uses the pending link once: a later sign-out and sign-in lands on home", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/album/MPREb_1" });
    await screen.findByTestId("album");
    await act(() => {
      mockCore.emit("signed_out");
      return Promise.resolve();
    });
    await screen.findByTestId("login");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(screen.queryByTestId("album")).toBeNull();
  });

  it("keeps no pending link for a cold /login", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/login" });
    await screen.findByTestId("login");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(everMounted.has("album")).toBe(false);
  });
});
