// INFO: root layout of the app; wires the core and the providers, mounts only an empty placeholder under the splash while the session is unknown, gates the routes by session status, hides the splash once the matching screen is mounted and mounts the player's autoplay and the next cover's prefetch while signed in.
import type { AuthStatus } from "@beatly/core";
import { color } from "@beatly/ui";
import { Stack, ThemeProvider, useSegments, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { navigationTheme } from "../src/navigationTheme.ts";
import { createCore } from "../src/createCore.ts";
import { CoreProvider } from "../src/providers/CoreProvider.tsx";
import { QueryProvider } from "../src/providers/QueryProvider.tsx";
import { SessionProvider, useSession } from "../src/providers/SessionProvider.tsx";
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

function RootNavigator() {
  const { status } = useSession();
  const reduceMotion = useReduceMotion();

  const landing = landingFor(status);

  // The status always starts unknown, so every route first redirects to the placeholder; once the status is known, the placeholder redirects away and the splash hides after the commit that mounts the screen it lands on.
  const [rootSegment] = useSegments();
  const settled = status !== "unknown" && rootSegment !== "session-pending";
  useEffect(() => {
    if (settled) void SplashScreen.hideAsync();
  }, [settled]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface.base },
        }}
      >
        <Stack.Protected guard={status === "unknown"} redirectTo={landing}>
          <Stack.Screen name="session-pending" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signed_in"} redirectTo={landing}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={playerRouteOptions(reduceMotion)} />
        </Stack.Protected>
        <Stack.Protected guard={status === "signed_out"} redirectTo={landing}>
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
            <StatusBar style="light" />
            <RootNavigator />
          </ThemeProvider>
        </SessionProvider>
      </QueryProvider>
    </CoreProvider>
  );
}
