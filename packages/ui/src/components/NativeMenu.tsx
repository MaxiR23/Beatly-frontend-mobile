// INFO: the only importer of @expo/ui: the iOS system menu opened by a three-dots button, one button per item. It is drawn only where isNativeMenuAvailable() is true (iOS with the ExpoUI module built in); everywhere else the caller draws its own sheet. The library is loaded lazily, once the native module is known to exist.
import { requireOptionalNativeModule } from "expo";
import type { ComponentProps } from "react";
import { Platform } from "react-native";
import type * as SwiftUI from "@expo/ui/swift-ui";
import type * as Modifiers from "@expo/ui/swift-ui/modifiers";

import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { layout } from "../tokens/spacing.ts";
import type { IconName } from "./Icon.tsx";

type SFSymbol = NonNullable<ComponentProps<typeof SwiftUI.Button>["systemImage"]>;

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
  x: "minus.circle",
  pencil: "pencil",
  trash: "trash",
};

// The library evaluates its native module on import, which crashes where the module is not built in (Expo Go), so it is checked before use.
export function isNativeMenuAvailable(): boolean {
  return Platform.OS === "ios" && requireOptionalNativeModule("ExpoUI") !== null;
}

export function NativeMenu({ accessibilityLabel, items, testID }: NativeMenuProps) {
  // A lazy require, not an import: the module must not load where it is missing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only once the native module is known to exist
  const { Host, Menu, Button, Image } = require("@expo/ui/swift-ui") as typeof SwiftUI;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded with the library above
  const modifiers = require("@expo/ui/swift-ui/modifiers") as typeof Modifiers;
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
