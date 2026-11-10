// INFO: Expo app config; reads the dark surface token instead of a literal color.
// INFO: expo-system-ui acts only through its config plugin (applied because the
// package is installed). expo-splash-screen is configured by its plugin and
// imported by the root layout to hold the splash until the session is known.
// expo-audio is not applied by default, so its plugin is listed with background playback on
// and the microphone off.
// typedRoutes stays off: it generates .expo/types/, which CI never has.
import { color } from "@beatly/ui";
import type { ExpoConfig } from "expo/config";

// INFO: one identifier for both stores; a dynamic config cannot be written by Expo,
// so a native build needs it here.
const appId = "com.maxirebolo.beatly";

// INFO: the signing team comes from the environment so the repo never versions it.
// Unset or empty omits the key and the config stays as without it. The name has no
// EXPO_PUBLIC_ prefix, so it is not inlined into the bundle, but the value still lands
// in the app config embedded in the native build. It is public, not a secret; the
// prefix is not the reason it is safe.
const appleTeamId = process.env.APPLE_TEAM_ID;

const config: ExpoConfig = {
  name: "Beatly",
  slug: "beatly",
  orientation: "portrait",
  scheme: "beatly",
  userInterfaceStyle: "dark",
  backgroundColor: color.surface.base,
  ios: {
    bundleIdentifier: appId,
    ...(appleTeamId ? { appleTeamId } : {}),
  },
  android: {
    package: appId,
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    // Background playback and the lock screen service; the app never records, so no microphone permission.
    [
      "expo-audio",
      { enableBackgroundPlayback: true, microphonePermission: false, recordAudioAndroid: false },
    ],
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
