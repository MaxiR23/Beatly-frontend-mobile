// The first test of a screen file pays the cold-start cost of the React Native
// preset (about 1.2 s locally, over 5 s on the CI runner). 15 s keeps a real
// hang visible. Measured on 2026-09-29.
const testTimeout = 15000;

export default {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|lucide-react-native))",
    "/node_modules/react-native-reanimated/plugin/",
  ],
  transform: {
    "\\.mjs$": [
      "babel-jest",
      {
        presets: ["babel-preset-expo"],
      },
    ],
  },
  testTimeout,
};
