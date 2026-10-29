// INFO: root layout of the app; wires the core and the providers, mounts only an empty placeholder under the splash while the session is unknown, keeps a cold deep link to a tab route while the session is unknown and opens it once on sign-in, gates the routes by session status, hides the splash once the matching screen is mounted and mounts the player's autoplay and the next cover's prefetch while signed in, and provides the window's insets to the sheets.
import type { AuthStatus } from "@beatly/core";
import { color } from "@beatly/ui";
import {
  Stack,
  ThemeProvider,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { navigationTheme } from "../src/navigationTheme.ts";
import { createCore } from "../src/createCore.ts";
import { CoreProvider } from "../src/providers/CoreProvider.tsx";
import { QueryProvider } from "../src/providers/QueryProvider.tsx";
import { SessionProvider, useSession } from "../src/providers/SessionProvider.tsx";
import { WindowInsetsProvider } from "../src/providers/WindowInsetsProvider.tsx";
import { Autoplay } from "../src/screens/player/Autoplay.tsx";
import { NextCoverPrefetch } from "../src/screens/player/NextCoverPrefetch.tsx";
import { playerRouteOptions } from "../src/screens/player/playerRoute.ts";
import { useReduceMotion } from "../src/screens/player/useReduceMotion.ts";

void SplashScreen.preventAutoHideAsync();

// Where a failing guard sends the user: the screen the status allows, the one the stack showed before SDK 58 turned a failing guard into a redirect.
function landingFor(status: "unknown" | AuthStatus): Href {
  if (status === "signed_in") return "/";
  if (status === "signed_out") return "/login";
  return "/session-pending";
}

// The cold URL the gate keeps while the status is unknown: a route of the signed-in tabs other than home. A shared detail route opens in the home tab; a tab's own route (under a folder named after its tab) keeps its tab.
function pendingFrom(
  segments: readonly string[],
  pathname: string,
  params: ReturnType<typeof useGlobalSearchParams>,
): Href | null {
  const [root, group, first = "", ...rest] = segments;
  if (root !== "(tabs)" || group === undefined || pathname === "/") return null;
  const tab = group === `(${first})` ? group : "(home)";
  return { pathname: `/(tabs)/${tab}/${[first, ...rest].join("/")}`, params };
}

function RootNavigator() {
  const { status } = useSession();
  const reduceMotion = useReduceMotion();

  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const [pending, setPending] = useState<Href | null>(() =>
    status === "unknown" ? pendingFrom(segments, pathname, params) : null,
  );
  const landing = landingFor(status);

  // The status always starts unknown, so every route first redirects to the placeholder; once the status is known, the placeholder redirects away and the splash hides after the commit that mounts the screen it lands on.
  const [rootSegment] = segments;
  const settled = status !== "unknown" && rootSegment !== "session-pending";
  useEffect(() => {
    if (settled) void SplashScreen.hideAsync();
  }, [settled]);

  // Used once: as soon as the signed-in tabs are shown, the kept URL is dropped, so a later sign-in lands on home.
  const opened = status === "signed_in" && rootSegment === "(tabs)";
  useEffect(() => {
    if (opened) setPending(null);
  }, [opened]);

  // Signed in with a kept link, the gate holds the screen it is on and opens the link itself: a guard redirect cannot seed the tab's anchor, a replace with withAnchor does.
  const router = useRouter();
  const opening = status === "signed_in" ? pending : null;
  const held =
    rootSegment === "session-pending" || rootSegment === "login" || rootSegment === "sign-up";
  useEffect(() => {
    if (opening !== null && held) router.replace(opening, { withAnchor: true });
  }, [opening, held, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface.base },
        }}
      >
        <Stack.Protected guard={status === "unknown" || opening !== null} redirectTo={landing}>
          <Stack.Screen name="session-pending" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signed_in"} redirectTo={landing}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={playerRouteOptions(reduceMotion)} />
        </Stack.Protected>
        <Stack.Protected guard={status === "signed_out" || opening !== null} redirectTo={landing}>
          <Stack.Screen name="login" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
      </Stack>
      {status === "signed_in" ? (
        <>
          <Autoplay />
          <NextCoverPrefetch />
        </>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  const [core] = useState(createCore);
  return (
    <CoreProvider core={core}>
      <QueryProvider>
        <SessionProvider>
          <ThemeProvider value={navigationTheme}>
            <WindowInsetsProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </WindowInsetsProvider>
          </ThemeProvider>
        </SessionProvider>
      </QueryProvider>
    </CoreProvider>
  );
}
