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
// - the onboarding gate: a pending profile opens the onboarding and not home, a completed one opens home and never the onboarding, an unknown profile holds the placeholder and the splash, a failed profile read draws the error with retry on the placeholder and retry lands where the profile says
// - a kept cold link opens after the onboarding, Get started lands on home without one and stores the onboarding as done on the phone
// - after signing in, the placeholder draws the loading state while the profile is unknown
// - the two startup paths of the device mark: stored for this account, home opens without waiting for the profile; not stored (nothing, or another account's), the profile decides
//
// Run with: pnpm --filter @beatly/mobile test -- app/_layout
//
// SEE: apps/mobile/app/_layout.tsx, apps/mobile/app/session-pending.tsx, apps/mobile/src/screens/album/AlbumScreen.tsx, apps/mobile/app/+not-found.tsx

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type * as Expo from "expo";
import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor, within } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import { useLayoutEffect, type ComponentType } from "react";

import type * as AlbumModule from "../../src/screens/album/AlbumScreen.tsx";
import type * as HomeModule from "../../src/screens/home/HomeScreen.tsx";
import type * as LoginModule from "../../src/screens/login/LoginScreen.tsx";
import type * as PlayerModule from "../../src/screens/player/PlayerScreen.tsx";
import type * as OnboardingModule from "../../src/screens/onboarding/OnboardingScreen.tsx";
import type * as PendingModule from "../../src/screens/sessionPending/SessionPendingScreen.tsx";
import type * as SignUpModule from "../../src/screens/signUp/SignUpScreen.tsx";
import { ONBOARDING_MARK_KEY } from "@beatly/core";
import { resources } from "../../src/i18n/resources.ts";
import { memoryStorage, profileFixture, successOf } from "../helpers/core.tsx";
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
jest.mock("../../src/screens/onboarding/OnboardingScreen.tsx", () => {
  const actual = jest.requireActual<typeof OnboardingModule>(
    "../../src/screens/onboarding/OnboardingScreen.tsx",
  );
  return { ...actual, OnboardingScreen: mockTracked("onboarding", actual.OnboardingScreen) };
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

const pendingProfile = () =>
  Promise.resolve(successOf({ ...profileFixture, onboarding_completed_at: null }));

async function pickFive() {
  for (let n = 1; n <= 5; n += 1) {
    await fireEvent.press(
      await screen.findByRole("button", { name: `Onboarding Artist ${String(n)}` }),
    );
  }
}

describe("the root layout onboarding gate", () => {
  it("opens the onboarding, not home, when signed in with onboarding_completed_at null", async () => {
    mockCore.set("signed_in", { getMyProfile: pendingProfile });
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("onboarding")).toBeTruthy();
    expect(everMounted.has("home")).toBe(false);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    const first = drawnAtHide[0] ?? [];
    expect(first).toContain("onboarding");
    expect(first).not.toContain("sessionPending");
  });

  it("opens home, never the onboarding, with a timestamp", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(everMounted.has("onboarding")).toBe(false);
  });

  it("holds the placeholder and the splash while the profile is unknown", async () => {
    mockCore.set("signed_in", { getMyProfile: () => new Promise(() => undefined) });
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("sessionPending")).toBeTruthy();
    await act(() => Promise.resolve());
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    expect(everMounted.has("home")).toBe(false);
    expect(everMounted.has("onboarding")).toBe(false);
  });

  it("draws the loading state on the placeholder after signing in while the profile is unknown", async () => {
    mockCore.set("signed_out", { getMyProfile: () => new Promise(() => undefined) });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("login");
    await act(() => {
      mockCore.emit("signed_in");
      return Promise.resolve();
    });
    const pending = await screen.findByTestId("sessionPending");
    expect(within(pending).getByLabelText(resources.en.common.loading)).toBeTruthy();
    expect(everMounted.has("home")).toBe(false);
    expect(everMounted.has("onboarding")).toBe(false);
  });

  it("draws the error with retry on the placeholder when the profile read fails, not home or the onboarding", async () => {
    mockCore.set("signed_in", {
      getMyProfile: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByText(resources.en.common.error.generic)).toBeTruthy();
    expect(everMounted.has("home")).toBe(false);
    expect(everMounted.has("onboarding")).toBe(false);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(drawnAtHide[0]).toContain("sessionPending");
  });

  it("retries the profile read and lands where the profile says", async () => {
    let reads = 0;
    mockCore.set("signed_in", {
      getMyProfile: () => {
        reads += 1;
        return reads === 1
          ? Promise.resolve({ kind: "api_failure", reason: "upstream_error" })
          : pendingProfile();
      },
    });
    await renderRouter("app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: resources.en.common.retry }));
    expect(await screen.findByTestId("onboarding")).toBeTruthy();
    expect(everMounted.has("home")).toBe(false);
  });

  it("keeps a cold link through the onboarding and opens it after Get started", async () => {
    mockCore.set("signed_in", { getMyProfile: pendingProfile });
    await renderRouter("app", { initialUrl: "/album/MPREb_1" });
    await screen.findByTestId("onboarding");
    expect(everMounted.has("album")).toBe(false);
    await pickFive();
    await fireEvent.press(await screen.findByRole("button", { name: "Continue (5)" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: resources.en.onboarding.welcome.start }),
    );
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect(router.canGoBack()).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: resources.en.album.back }));
    expect(await screen.findByTestId("home")).toBeTruthy();
  });

  it("Get started lands on home without a kept link and stores the onboarding as done for this account", async () => {
    const storage = memoryStorage();
    const set = jest.spyOn(storage, "set");
    mockCore.set("signed_in", { getMyProfile: pendingProfile, storage });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("onboarding");
    await pickFive();
    await fireEvent.press(await screen.findByRole("button", { name: "Continue (5)" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: resources.en.onboarding.welcome.start }),
    );
    expect(await screen.findByTestId("home")).toBeTruthy();
    await waitFor(() => {
      expect(set).toHaveBeenCalledWith(ONBOARDING_MARK_KEY, "user-1");
    });
  });

  it("starts on home without waiting for the profile when the onboarding is stored as done on this phone", async () => {
    mockCore.set("signed_in", {
      storage: memoryStorage({ [ONBOARDING_MARK_KEY]: "user-1" }),
      getMyProfile: () => new Promise(() => undefined),
    });
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(drawnAtHide[0]).toContain("home");
    expect(drawnAtHide[0]).not.toContain("sessionPending");
    expect(everMounted.has("onboarding")).toBe(false);
  });

  it("another account's mark on this phone does not skip the onboarding", async () => {
    mockCore.set("signed_in", {
      storage: memoryStorage({ [ONBOARDING_MARK_KEY]: "user-2" }),
      getMyProfile: pendingProfile,
    });
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("onboarding")).toBeTruthy();
    expect(everMounted.has("home")).toBe(false);
  });
});
