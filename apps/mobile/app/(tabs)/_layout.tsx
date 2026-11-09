// INFO: the tab navigator: native tabs with system icons on iOS 26+, the JS navigator with our tab bar elsewhere: the pill on iOS below 26 (ADR 017), the docked bar on Android (ADR 035); the mini player sits above the tabs in all three, as the system bottom accessory (bare, inside the system's capsule) or as the bar's accessory; the status strip (offline, a failed track) sits above the mini player, or above the tab row or pill when none is loaded, as the bar's status slot, and as an overlay over the native tabs on iOS 26+.
import { color } from "@beatly/ui";
import { FloatingTabBar, isGlassAvailable } from "@beatly/ui/native";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { NativeTabs } from "expo-router/native-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../src/adapters/i18n.ts";
import {
  BottomStatus,
  BottomStatusOverlay,
  useBottomStatus,
} from "../../src/screens/connection/BottomStatus.tsx";
import { MiniPlayerBar } from "../../src/screens/player/MiniPlayerBar.tsx";
import { usePlayback } from "../../src/screens/player/usePlayback.ts";

const tabs = [
  {
    name: "(home)",
    fill: true,
    label: "home",
    icon: "house",
    sf: { default: "house", selected: "house.fill" },
  },
  {
    name: "(explore)",
    fill: false,
    label: "explore",
    icon: "compass",
    sf: { default: "safari", selected: "safari.fill" },
  },
  { name: "(search)", fill: false, label: "search", icon: "search", sf: "magnifyingglass" },
  {
    name: "(library)",
    fill: false,
    label: "library",
    icon: "library",
    sf: { default: "books.vertical", selected: "books.vertical.fill" },
  },
] as const;

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const t = useT("tabs");
  const insets = useSafeAreaInsets();
  const hasTrack = usePlayback((state) => state.current !== null);
  const { kind } = useBottomStatus();

  const items = state.routes.flatMap((route, index) => {
    const tab = tabs.find((candidate) => candidate.name === route.name);
    if (tab === undefined) return [];
    const selected = state.index === index;
    return [
      {
        key: route.key,
        icon: tab.icon,
        label: t(tab.label),
        selected,
        fillWhenSelected: tab.fill,
        onPress: () => {
          const event = emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected && !event.defaultPrevented) navigateToTab(route.key);
        },
      },
    ];
  });

  return (
    <FloatingTabBar
      tabs={items}
      bottomInset={insets.bottom}
      accessory={hasTrack ? <MiniPlayerBar /> : undefined}
      status={kind === null ? undefined : <BottomStatus />}
    />
  );
}

export default function TabsLayout() {
  const t = useT("tabs");
  const hasTrack = usePlayback((state) => state.current !== null);

  if (isGlassAvailable()) {
    return (
      <View style={styles.fill}>
        <NativeTabs
          tintColor={color.text.primary}
          iconColor={{ default: color.text.secondary, selected: color.text.primary }}
        >
          {hasTrack ? (
            <NativeTabs.BottomAccessory>
              <MiniPlayerBar surface="bare" />
            </NativeTabs.BottomAccessory>
          ) : null}
          {tabs.map((tab) => (
            <NativeTabs.Trigger key={tab.name} name={tab.name} accessibilityLabel={t(tab.label)}>
              <NativeTabs.Trigger.Icon sf={tab.sf} />
              <NativeTabs.Trigger.Label hidden />
            </NativeTabs.Trigger>
          ))}
        </NativeTabs>
        <BottomStatusOverlay />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.surface.base } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export { UnexpectedErrorScreen as ErrorBoundary } from "../../src/screens/unexpectedError/UnexpectedErrorScreen.tsx";
