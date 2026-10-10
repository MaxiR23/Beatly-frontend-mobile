// INFO: the only importer of expo-constants; reads the platform, the OS release and the app's config version for the playback error reports; no port because core receives a plain value.
import type { PlaybackDevice } from "@beatly/core";
import Constants from "expo-constants";
import { Platform } from "react-native";

// When the config is missing; the backend needs a non-empty value.
export const UNKNOWN_APP_VERSION = "unknown";

export function readDevice(): PlaybackDevice {
  const version = Constants.expoConfig?.version;
  const appVersion = version === undefined || version === "" ? UNKNOWN_APP_VERSION : version;
  if (Platform.OS === "ios") {
    return { platform: "ios", osVersion: Platform.Version, appVersion };
  }
  // The release ("14"), not the API level (Platform.Version, a number).
  if (Platform.OS === "android") {
    return { platform: "android", osVersion: Platform.constants.Release, appVersion };
  }
  // The app ships on iOS and Android only; every other platform reads as android, as the stream resolver does.
  return { platform: "android", osVersion: String(Platform.Version), appVersion };
}
