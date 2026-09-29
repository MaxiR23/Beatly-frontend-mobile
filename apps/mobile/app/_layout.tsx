// INFO: root layout of the app; the query provider wraps a stack that hides its header and paints the dark surface behind every route.
import { color } from "@beatly/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { QueryProvider } from "../src/providers/QueryProvider.tsx";

export default function RootLayout() {
  return (
    <QueryProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface.base },
        }}
      />
    </QueryProvider>
  );
}
