// INFO: the iOS edit list drawn through the swiftUI loader (ADR 025): a SwiftUI List in edit mode with the system drag handles and delete, one row per item with its title over its subtitle and no cover, then a trailing inert spacer row of bottomInset points so the last item scrolls clear of the tab bar while the list itself fills the body; SwiftUI reports a move as source indices and a destination offset counted before the row is removed, which is converted here so onMove(fromIndex, toIndex) gets the row's final zero-based index, and only a single-row, effective move is reported; onRemove(index) is called for a single deleted row. It is drawn only where isNativeEditListAvailable() is true; everywhere else the caller draws ReorderList.
import { color } from "../tokens/color.ts";
import { typography } from "../tokens/typography.ts";
import type { EditListItem } from "./editList.ts";
import { isSwiftUIAvailable, loadSwiftUI } from "./swiftUI.ts";

interface NativeEditListProps {
  items: readonly EditListItem[];
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  moveHint: string;
  bottomInset: number;
  testID?: string;
}

type SwiftUIWeight = "regular" | "semibold";

// The weights of the typography tokens as SwiftUI names them.
const swiftUIWeight: Record<string, SwiftUIWeight> = {
  "400": "regular",
  "600": "semibold",
};

export function isNativeEditListAvailable(): boolean {
  return isSwiftUIAvailable();
}

// SwiftUI's destination is an offset counted before the moved row is removed; the result is the row's final zero-based index.
export function swiftUIMoveTarget(source: number, destination: number): number {
  return destination > source ? destination - 1 : destination;
}

export function NativeEditList({
  items,
  onMove,
  onRemove,
  moveHint,
  bottomInset,
  testID,
}: NativeEditListProps) {
  const { views, modifiers } = loadSwiftUI();
  const { Host, List, VStack, Text, Spacer } = views;
  const {
    listStyle,
    scrollContentBackground,
    environment,
    listRowBackground,
    accessibilityLabel,
    accessibilityValue,
    accessibilityHint,
    font,
    foregroundStyle,
    lineLimit,
    frame,
    listRowSeparator,
    accessibilityHidden,
  } = modifiers;
  return (
    <Host
      colorScheme="dark"
      seedColor={color.text.primary}
      style={{ flex: 1 }}
      {...(testID !== undefined ? { testID } : {})}
    >
      <List
        modifiers={[
          listStyle("plain"),
          scrollContentBackground("hidden"),
          environment({ key: "editMode", value: "active" }),
        ]}
      >
        <List.ForEach
          onMove={(sourceIndices, destination) => {
            const [source] = sourceIndices;
            if (sourceIndices.length !== 1 || source === undefined) return;
            const to = swiftUIMoveTarget(source, destination);
            if (to !== source) onMove(source, to);
          }}
          onDelete={(indices) => {
            const [index] = indices;
            if (indices.length === 1 && index !== undefined) onRemove(index);
          }}
        >
          {items.map((item) => (
            <VStack
              key={item.key}
              alignment="leading"
              modifiers={[
                listRowBackground(color.surface.base),
                accessibilityLabel(item.label),
                accessibilityValue(item.positionLabel),
                accessibilityHint(moveHint),
              ]}
            >
              <Text
                modifiers={[
                  font({
                    size: typography.rowTitle.fontSize,
                    weight: swiftUIWeight[typography.rowTitle.fontWeight] ?? "semibold",
                  }),
                  foregroundStyle(color.text.primary),
                  lineLimit(1),
                ]}
              >
                {item.title}
              </Text>
              {item.subtitle !== undefined ? (
                <Text
                  modifiers={[
                    font({
                      size: typography.meta.fontSize,
                      weight: swiftUIWeight[typography.meta.fontWeight] ?? "regular",
                    }),
                    foregroundStyle(color.text.secondary),
                    lineLimit(1),
                  ]}
                >
                  {item.subtitle}
                </Text>
              ) : null}
            </VStack>
          ))}
        </List.ForEach>
        <Spacer
          modifiers={[
            frame({ height: bottomInset }),
            listRowBackground("transparent"),
            listRowSeparator("hidden"),
            accessibilityHidden(true),
          ]}
        />
      </List>
    </Host>
  );
}
