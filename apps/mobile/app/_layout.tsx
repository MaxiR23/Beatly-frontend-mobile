// INFO: root layout of the app; wires the core and the providers, mounts only an empty placeholder under the splash while the session or the profile is unknown (a failed profile read draws its error there), keeps a cold deep link to a tab route while the session is unknown and opens it once the gate allows home, gates the routes by the session status and the onboarding (the device mark, or the profile's onboarding_completed_at: a pending onboarding opens the onboarding), hides the splash once the matching screen is mounted and mounts the player's autoplay and the next cover's prefetch while signed in, and provides the window's insets to the sheets.
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
import { useOnboardingGate, type Gate } from "../src/screens/onboarding/useOnboardingGate.ts";
import { useReduceMotion } from "../src/screens/player/useReduceMotion.ts";

void SplashScreen.preventAutoHideAsync();

// Where a failing guard sends the user: the screen the status allows, the one the stack showed before SDK 58 turned a failing guard into a redirect.
function landingFor(gate: Gate): Href {
  if (gate === "home") return "/";
  if (gate === "onboarding") return "/onboarding";
  if (gate === "signed_out") return "/login";
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
  const { gate } = useOnboardingGate();
  const reduceMotion = useReduceMotion();

  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const [pending, setPending] = useState<Href | null>(() =>
    status === "unknown" ? pendingFrom(segments, pathname, params) : null,
  );
  const landing = landingFor(gate);

  // The status always starts unknown, so every route first redirects to the placeholder; while a signed-in profile is unknown the placeholder holds too. Once the gate is decided, the placeholder redirects away and the splash hides after the commit that mounts the screen it lands on; a failed profile read stays on the placeholder, which draws its error.
  const [rootSegment] = segments;
  const settled = gate !== "deciding" && (rootSegment !== "session-pending" || gate === "failed");
  useEffect(() => {
    if (settled) void SplashScreen.hideAsync();
  }, [settled]);

  // Used once: as soon as the signed-in tabs are shown, the kept URL is dropped, so a later sign-in lands on home.
  const opened = gate === "home" && rootSegment === "(tabs)";
  useEffect(() => {
    if (opened) setPending(null);
  }, [opened]);

  // With home allowed and a kept link, the gate holds the screen it is on (the onboarding included, until it is done) and opens the link itself: a guard redirect cannot seed the tab's anchor, a replace with withAnchor does.
  const router = useRouter();
  const opening = gate === "home" ? pending : null;
  const held =
    rootSegment === "session-pending" ||
    rootSegment === "login" ||
    rootSegment === "sign-up" ||
    rootSegment === "onboarding";
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
        <Stack.Protected
          guard={gate === "deciding" || gate === "failed" || opening !== null}
          redirectTo={landing}
        >
          <Stack.Screen name="session-pending" />
        </Stack.Protected>
        <Stack.Protected guard={gate === "onboarding" || opening !== null} redirectTo={landing}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={gate === "home"} redirectTo={landing}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={playerRouteOptions(reduceMotion)} />
        </Stack.Protected>
        <Stack.Protected guard={gate === "signed_out" || opening !== null} redirectTo={landing}>
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
