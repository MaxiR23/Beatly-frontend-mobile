// INFO: drawn through the swiftUI loader: the iOS system menu opened by a three-dots button, one button per item. It is drawn only where isNativeMenuAvailable() is true (iOS with the ExpoUI module built in); everywhere else the caller draws its own sheet. The library is loaded lazily, once the native module is known to exist.
import type { ComponentProps } from "react";

import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { layout } from "../tokens/spacing.ts";
import type { IconName } from "./Icon.tsx";
import { isSwiftUIAvailable, loadSwiftUI, type SwiftUIViews } from "./swiftUI.ts";

type SFSymbol = NonNullable<ComponentProps<SwiftUIViews["Button"]>["systemImage"]>;

export interface NativeMenuItem {
  key: string;
  label: string;
  icon: IconName;
  destructive?: boolean;
  onSelect: () => void;
}

interface NativeMenuProps {
  accessibilityLabel: string;
  items: readonly NativeMenuItem[];
  testID?: string;
}

// The second SF Symbols exception after the native tab bar (ADR 023): the system menu draws SF Symbols, not our Icon.
const sfSymbol: Partial<Record<IconName, SFSymbol>> = {
  heart: "heart",
  plus: "plus",
  user: "person",
  music: "music.note",
  info: "info.circle",
  flag: "flag",
  x: "minus.circle",
};

export function isNativeMenuAvailable(): boolean {
  return isSwiftUIAvailable();
}

export function NativeMenu({ accessibilityLabel, items, testID }: NativeMenuProps) {
  const { views, modifiers } = loadSwiftUI();
  const { Host, Menu, Button, Image } = views;
  const labelModifier = modifiers.accessibilityLabel;
  return (
    <Host
      matchContents
      // The Host tints its content with the system accent otherwise; same color as the rest of the icons.
      seedColor={color.text.primary}
      style={{ width: layout.controlHeight, height: layout.controlHeight }}
      {...(testID !== undefined ? { testID } : {})}
    >
      <Menu
        modifiers={[labelModifier(accessibilityLabel)]}
        label={<Image systemName="ellipsis" size={icon.size.lg} />}
      >
        {items.map((item) => {
          const systemImage = sfSymbol[item.icon];
          return (
            <Button
              key={item.key}
              label={item.label}
              {...(systemImage !== undefined ? { systemImage } : {})}
              role={item.destructive === true ? "destructive" : "default"}
              onPress={item.onSelect}
            />
          );
        })}
      </Menu>
    </Host>
  );
}
