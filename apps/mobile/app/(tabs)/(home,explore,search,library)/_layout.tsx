// INFO: one stack per tab, declared once for the four tab groups (ADR 020); each tab keeps its own back stack and shares the detail routes.
import { color } from "@beatly/ui";
import { Stack } from "expo-router";

export const unstable_settings = {
  home: { anchor: "index" },
  explore: { anchor: "explore/index" },
  search: { anchor: "search" },
  library: { anchor: "library" },
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
