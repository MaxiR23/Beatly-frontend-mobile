// INFO: Expo app config; reads the dark surface token instead of a literal color.
// INFO: expo-system-ui and expo-splash-screen have no import anywhere: they act
// through Expo's own config plugins (applied because the packages are installed),
// so they stay declared as dependencies even though nothing imports them.
// typedRoutes stays off: it generates .expo/types/, which CI never has.
import { color } from "@beatly/ui";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Beatly",
  slug: "beatly",
  orientation: "portrait",
  scheme: "beatly",
  userInterfaceStyle: "dark",
  backgroundColor: color.surface.base,
  android: {
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: color.surface.base,
      },
    ],
  ],
  experiments: {
    reactCompiler: true,
  },
};

export default config;
