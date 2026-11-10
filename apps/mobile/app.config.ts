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

const config: ExpoConfig = {
  name: "Beatly",
  slug: "beatly",
  orientation: "portrait",
  scheme: "beatly",
  userInterfaceStyle: "dark",
  backgroundColor: color.surface.base,
  ios: {
    bundleIdentifier: appId,
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
