// INFO: the tab navigator: native tabs with system icons on iOS 26+, the JS navigator with our floating bar elsewhere (ADR 017).
import { color } from "@beatly/ui";
import { FloatingTabBar, isGlassAvailable } from "@beatly/ui/native";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../src/adapters/i18n.ts";

const tabs = [
  {
    name: "(home)",
    label: "home",
    icon: "house",
    sf: { default: "house", selected: "house.fill" },
  },
  {
    name: "(explore)",
    label: "explore",
    icon: "compass",
    sf: { default: "safari", selected: "safari.fill" },
  },
  { name: "(search)", label: "search", icon: "search", sf: "magnifyingglass" },
  {
    name: "(library)",
    label: "library",
    icon: "library",
    sf: { default: "books.vertical", selected: "books.vertical.fill" },
  },
] as const;

function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useT("tabs");
  const insets = useSafeAreaInsets();

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
        onPress: () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        },
      },
    ];
  });

  return <FloatingTabBar tabs={items} bottomInset={insets.bottom} />;
}

export default function TabsLayout() {
  const t = useT("tabs");

  if (isGlassAvailable()) {
    return (
      <NativeTabs
        tintColor={color.text.primary}
        iconColor={{ default: color.text.secondary, selected: color.text.primary }}
      >
        {tabs.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name} accessibilityLabel={t(tab.label)}>
            <NativeTabs.Trigger.Icon sf={tab.sf} />
            <NativeTabs.Trigger.Label hidden />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
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
