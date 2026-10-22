// INFO: root layout of the app; wires the core and the providers, mounts only an empty placeholder under the splash while the session is unknown, gates the routes by session status, hides the splash once the matching screen is mounted and mounts the player's autoplay while signed in.
import { color } from "@beatly/ui";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { navigationTheme } from "../src/navigationTheme.ts";
import { createCore } from "../src/createCore.ts";
import { CoreProvider } from "../src/providers/CoreProvider.tsx";
import { QueryProvider } from "../src/providers/QueryProvider.tsx";
import { SessionProvider, useSession } from "../src/providers/SessionProvider.tsx";
import { Autoplay } from "../src/screens/player/Autoplay.tsx";
import { playerRouteOptions } from "../src/screens/player/playerRoute.ts";
import { useReduceMotion } from "../src/screens/player/useReduceMotion.ts";

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useSession();
  const reduceMotion = useReduceMotion();

  // Runs after the commit that mounts the screen matching the status: the stack computes its new routes in the same render.
  useEffect(() => {
    if (status !== "unknown") void SplashScreen.hideAsync();
  }, [status]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface.base },
        }}
      >
        <Stack.Protected guard={status === "unknown"}>
          <Stack.Screen name="session-pending" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signed_in"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={playerRouteOptions(reduceMotion)} />
        </Stack.Protected>
        <Stack.Protected guard={status === "signed_out"}>
          <Stack.Screen name="login" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
      </Stack>
      {status === "signed_in" ? <Autoplay /> : null}
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
