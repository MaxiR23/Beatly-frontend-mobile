// INFO: one stack per tab, declared once for the four tab groups (ADR 020); each tab keeps its own back stack and shares the detail routes.
import { color } from "@beatly/ui";
import { Stack } from "expo-router";

export const unstable_settings = {
  home: { initialRouteName: "index" },
  explore: { initialRouteName: "explore/index" },
  search: { initialRouteName: "search" },
  library: { initialRouteName: "library" },
};

export default function TabStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.surface.base },
      }}
    />
  );
}
