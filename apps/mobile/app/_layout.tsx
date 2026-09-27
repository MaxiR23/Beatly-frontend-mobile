// INFO: root layout of the app; the stack hides its header and paints the dark surface behind every route.
import { color } from "@beatly/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.surface.base },
        }}
      />
    </>
  );
}
