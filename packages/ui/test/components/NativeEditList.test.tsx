// packages/ui/test/components/NativeEditList.test.tsx
//
// Tests for the NativeEditList.
//
// Tested:
// - NativeEditList
// - isNativeEditListAvailable
// - swiftUIMoveTarget
//
// What is covered:
// - the conversion of SwiftUI's destination offset to the final index: down, up, first, last, no move
// - available on iOS when the ExpoUI module exists, not without the module, not on Android
// - onMove with the final index, not for a move to its own place or a multi-row move
// - onRemove with the deleted row's index
// - each row's label, position value and move hint, and its title and subtitle in order
//
// Run with: pnpm --filter @beatly/ui test -- NativeEditList
//
// SEE: packages/ui/src/components/NativeEditList.tsx

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen, within } from "@testing-library/react-native";
import { Platform } from "react-native";

import type { EditListItem } from "../../src/components/editList.ts";
import {
  NativeEditList,
  isNativeEditListAvailable,
  swiftUIMoveTarget,
} from "../../src/components/NativeEditList.tsx";

interface ReactNativeParts {
  Text: unknown;
  View: unknown;
}

const mockNative: { module: object | null } = { module: {} };

jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative.module }));
jest.mock("@expo/ui/swift-ui", () => {
  const { Text, View } = jest.requireActual<ReactNativeParts>("react-native") as {
    Text: React.ComponentType<Record<string, unknown>>;
    View: React.ComponentType<Record<string, unknown>>;
  };
  const merged = (modifiers: Record<string, unknown>[] | undefined): Record<string, unknown> =>
    (modifiers ?? []).reduce((all, one) => ({ ...all, ...one }), {});
  const passthrough = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  const List = Object.assign(passthrough, {
    ForEach: ({
      children,
      onMove,
      onDelete,
    }: {
      children?: React.ReactNode;
      onMove: unknown;
      onDelete: unknown;
    }) => (
      <View testID="foreach" onMove={onMove} onDelete={onDelete}>
        {children}
      </View>
    ),
  });
  return {
    Host: passthrough,
    List,
    VStack: ({
      children,
      modifiers,
    }: {
      children?: React.ReactNode;
      modifiers?: Record<string, unknown>[];
    }) => <View {...merged(modifiers)}>{children}</View>,
    Spacer: ({ modifiers }: { modifiers?: Record<string, unknown>[] }) => (
      <View testID="edit-list-spacer" {...merged(modifiers)} />
    ),
    Text: ({
      children,
      modifiers,
    }: {
      children?: React.ReactNode;
      modifiers?: Record<string, unknown>[];
    }) => <Text {...merged(modifiers)}>{children}</Text>,
  };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => {
  const modifier = (name: string) => (value: unknown) => ({ [name]: value });
  return {
    listStyle: modifier("listStyle"),
    scrollContentBackground: modifier("scrollContentBackground"),
    environment: modifier("environment"),
    listRowBackground: modifier("listRowBackground"),
    accessibilityLabel: modifier("accessibilityLabel"),
    accessibilityValue: modifier("accessibilityValue"),
    accessibilityHint: modifier("accessibilityHint"),
    font: modifier("font"),
    foregroundStyle: modifier("foregroundStyle"),
    lineLimit: modifier("lineLimit"),
    frame: modifier("frame"),
    listRowSeparator: modifier("listRowSeparator"),
    accessibilityHidden: modifier("accessibilityHidden"),
  };
});

beforeEach(() => {
  mockNative.module = {};
  Platform.OS = "ios";
});

const item = (key: string, title: string, subtitle?: string): EditListItem => ({
  key,
  title,
  subtitle,
  urls: [],
  label: subtitle === undefined ? title : `${title}, ${subtitle}`,
  positionLabel: `${key} of 3`,
  removeLabel: `Remove ${title}`,
  moveLabel: `Move ${title}`,
});

const items = [item("1", "One", "Ann"), item("2", "Two"), item("3", "Three", "Cy")];

function forEachProps() {
  return screen.getByTestId("foreach").props as {
    onMove: (sources: number[], destination: number) => void;
    onDelete: (indices: number[]) => void;
  };
}

async function setup(bottomInset = 0) {
  const onMove = jest.fn();
  const onRemove = jest.fn();
  await render(
    <NativeEditList
      items={items}
      onMove={onMove}
      onRemove={onRemove}
      moveHint="Drag to reorder"
      bottomInset={bottomInset}
    />,
  );
  return { onMove, onRemove };
}

describe("swiftUIMoveTarget", () => {
  it("moves down: an offset past the row lands one before it", () => {
    expect(swiftUIMoveTarget(0, 3)).toBe(2);
  });

  it("moves up", () => {
    expect(swiftUIMoveTarget(3, 1)).toBe(1);
  });

  it("moves to the first place", () => {
    expect(swiftUIMoveTarget(4, 0)).toBe(0);
  });

  it("moves to the last place", () => {
    expect(swiftUIMoveTarget(0, 5)).toBe(4);
  });

  it("an offset of its own index or the next one is no move", () => {
    expect(swiftUIMoveTarget(2, 2)).toBe(2);
    expect(swiftUIMoveTarget(2, 3)).toBe(2);
  });
});

describe("isNativeEditListAvailable", () => {
  it("is available on iOS when the ExpoUI module exists", () => {
    expect(isNativeEditListAvailable()).toBe(true);
  });

  it("is not available without the module", () => {
    mockNative.module = null;
    expect(isNativeEditListAvailable()).toBe(false);
  });

  it("is not available on Android", () => {
    Platform.OS = "android";
    expect(isNativeEditListAvailable()).toBe(false);
  });
});

describe("NativeEditList", () => {
  it("calls onMove with the final index when SwiftUI reports a move", async () => {
    const { onMove } = await setup();
    await act(() => {
      forEachProps().onMove([0], 3);
    });
    expect(onMove).toHaveBeenCalledWith(0, 2);
  });

  it("ignores a move to its own place", async () => {
    const { onMove } = await setup();
    await act(() => {
      forEachProps().onMove([1], 2);
      forEachProps().onMove([1], 1);
    });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignores a multi-row move", async () => {
    const { onMove } = await setup();
    await act(() => {
      forEachProps().onMove([0, 1], 3);
    });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("calls onRemove with the deleted row's index", async () => {
    const { onRemove } = await setup();
    await act(() => {
      forEachProps().onDelete([1]);
    });
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("gives each row its label, its position as accessibility value and the move hint", async () => {
    await setup();
    const row = screen.getByLabelText("One, Ann");
    expect(row.props.accessibilityValue).toBe("1 of 3");
    expect(row.props.accessibilityHint).toBe("Drag to reorder");
    expect(screen.getByLabelText("Two")).toBeTruthy();
  });

  it("draws each row's title and subtitle in order", async () => {
    await setup();
    const texts = screen.getAllByText(/./).map((node) => node.props.children as string);
    expect(texts).toEqual(["One", "Ann", "Two", "Three", "Cy"]);
  });

  it("ends the list with an inert spacer row of the bottom inset, outside the movable rows", async () => {
    await setup(171);
    const spacer = screen.getByTestId("edit-list-spacer");
    expect(spacer.props).toMatchObject({
      frame: { height: 171 },
      listRowBackground: "transparent",
      listRowSeparator: "hidden",
      accessibilityHidden: true,
    });
    expect(within(screen.getByTestId("foreach")).queryByTestId("edit-list-spacer")).toBeNull();
  });
});
