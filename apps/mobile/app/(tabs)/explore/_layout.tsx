// INFO: the explore tab's stack: the genre list, and a genre's playlists pushed over it.
import { color } from "@beatly/ui";
import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "index" };

export default function ExploreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.surface.base },
      }}
    />
  );
}
