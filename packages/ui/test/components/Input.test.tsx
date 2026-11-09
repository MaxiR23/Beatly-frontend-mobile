// packages/ui/test/components/Input.test.tsx
//
// Tests for the Input's eye button.
//
// Tested:
// - Input
//
// What is covered:
// - With reveal, the entry starts hidden, the eye shows it and hides it again, and its label follows the state
// - Without reveal there is no eye button and secureTextEntry passes through
// - multiline passes through to the text entry
// - the prefix is drawn before the entry and is not part of its value
// - iOS: the label above, the box on the card surface, no outline overlay, no animation
// - iOS: the error is drawn by ErrorText, announced once when it appears or changes and again on a new errorAttempt, never on every render or when it goes away, and is the text entry's accessibilityHint; Android does not announce and keeps the alert role and polite live region
// - Android: the outline with radius.xs corners and no fill; the label resting inside and raised onto the outline on focus or with text; Animated.timing on the native driver for motion.duration.fast; no animation under reduce motion; the focused outline in border.widthFocused and the accent; the error color on outline and label and the error under the field; the label as accessible name and the error announced; the eye, multiline and the prefix
//
// Run with: pnpm --filter @beatly/ui test -- Input
//
// SEE: packages/ui/src/components/Input.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Input } from "../../src/components/Input.tsx";
import { border } from "../../src/tokens/border.ts";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  Platform.OS = "ios";
  timing.mockClear();
});

function flat(node: { props: { style?: unknown } }): ViewStyle {
  return flatStyle(node.props.style);
}

function labelTextColor(): unknown {
  const text = screen.getByText("Name", { includeHiddenElements: true });
  return flatStyle(text.props.style as StyleProp<TextStyle>).color;
}

const restTop = (layout.controlHeight - typography.body.lineHeight) / 2;
const raisedShift = -(restTop + typography.body.lineHeight / 2);
const raisedScale = typography.meta.fontSize / typography.body.fontSize;
const label = () => screen.getByTestId("input-label", { includeHiddenElements: true });
const outline = () => screen.getByTestId("input-outline");

const reveal = { show: "Show", hide: "Hide" };

describe("Input", () => {
  it("starts hidden and shows the entry when the eye is pressed", async () => {
    await render(
      <Input
        reduceMotion={false}
        label="Password"
        value="x"
        onChangeText={jest.fn()}
        reveal={reveal}
      />,
    );
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
  });

  it("hides the entry again on a second press", async () => {
    await render(
      <Input
        reduceMotion={false}
        label="Password"
        value="x"
        onChangeText={jest.fn()}
        reveal={reveal}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Show" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("draws no eye button without reveal", async () => {
    await render(
      <Input
        reduceMotion={false}
        label="Password"
        value="x"
        onChangeText={jest.fn()}
        secureTextEntry
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("passes multiline through to the text entry", async () => {
    await render(
      <Input
        reduceMotion={false}
        label="Description"
        value="x"
        onChangeText={jest.fn()}
        multiline
      />,
    );
    expect(screen.getByLabelText("Description").props.multiline).toBe(true);
  });

  it("is single line without the prop", async () => {
    await render(
      <Input reduceMotion={false} label="Description" value="x" onChangeText={jest.fn()} />,
    );
    expect(screen.getByLabelText("Description").props.multiline).toBeFalsy();
  });

  it("draws the prefix before the entry and keeps it out of the value", async () => {
    await render(
      <Input
        reduceMotion={false}
        label="Username"
        value="maxi"
        onChangeText={jest.fn()}
        prefix="@"
      />,
    );
    expect(screen.getByText("@")).toBeTruthy();
    expect(screen.getByLabelText("Username").props.value).toBe("maxi");
  });

  it("draws the iOS field as before: the caption above, no outline overlay, no animation", async () => {
    await render(<Input reduceMotion={false} label="Name" value="" onChangeText={jest.fn()} />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.queryByTestId("input-outline")).toBeNull();
    await fireEvent(screen.getByLabelText("Name"), "focus");
    expect(timing).not.toHaveBeenCalled();
  });
});

describe("Input on Android", () => {
  async function renderAndroid(props: Partial<Parameters<typeof Input>[0]> = {}) {
    Platform.OS = "android";
    await render(
      <Input reduceMotion={false} label="Name" value="" onChangeText={jest.fn()} {...props} />,
    );
  }

  it("draws an outline with extra-small corners and no fill", async () => {
    await renderAndroid();
    const style = flat(outline());
    expect(style.borderRadius).toBe(radius.xs);
    expect(style.borderWidth).toBe(border.width);
    expect(style.borderColor).toBe(color.surface.border);
    expect(flat(screen.getByLabelText("Name").parent as never).backgroundColor).toBeUndefined();
    expect(flatStyle(label().props.style as StyleProp<ViewStyle>).backgroundColor).toBe(
      color.surface.raised,
    );
  });

  it("rests the label inside an empty unfocused field, without a placeholder", async () => {
    await renderAndroid({ placeholder: "Your name" });
    const style = flat(label());
    expect(style.top).toBe(restTop);
    expect(style.transform).toEqual([{ translateY: 0 }, { scale: 1 }]);
    expect(screen.getByLabelText("Name").props.placeholder).toBeUndefined();
    expect(timing).not.toHaveBeenCalled();
  });

  it("raises the label on focus with an animation from tokens", async () => {
    await renderAndroid({ placeholder: "Your name" });
    await fireEvent(screen.getByLabelText("Name"), "focus");
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }),
    );
    expect(screen.getByLabelText("Name").props.placeholder).toBe("Your name");
  });

  it("raises the label at once when the field mounts with text", async () => {
    await renderAndroid({ value: "x" });
    expect(flat(label()).transform).toEqual([{ translateY: raisedShift }, { scale: raisedScale }]);
    expect(timing).not.toHaveBeenCalled();
  });

  it("lowers the label again on blur of an empty field", async () => {
    await renderAndroid();
    await fireEvent(screen.getByLabelText("Name"), "focus");
    await fireEvent(screen.getByLabelText("Name"), "blur");
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 }),
    );
  });

  it("moves the label without an animation under reduce motion", async () => {
    await renderAndroid({ reduceMotion: true });
    await fireEvent(screen.getByLabelText("Name"), "focus");
    expect(timing).not.toHaveBeenCalled();
    expect(flat(label()).transform).toEqual([{ translateY: raisedShift }, { scale: raisedScale }]);
  });

  it("draws a thicker accent outline while focused", async () => {
    await renderAndroid();
    await fireEvent(screen.getByLabelText("Name"), "focus");
    expect(flat(outline()).borderWidth).toBe(border.widthFocused);
    expect(flat(outline()).borderColor).toBe(color.accent.primary);
    expect(labelTextColor()).toBe(color.text.primary);
    await fireEvent(screen.getByLabelText("Name"), "blur");
    expect(flat(outline()).borderWidth).toBe(border.width);
    expect(flat(outline()).borderColor).toBe(color.surface.border);
  });

  it("draws the error under the field and colors the outline and the label", async () => {
    await renderAndroid({ error: "Too long" });
    expect(flat(outline()).borderColor).toBe(color.status.error);
    expect(labelTextColor()).toBe(color.status.error);
    const error = screen.getByTestId("input-error");
    expect(screen.getByText("Too long")).toBeTruthy();
    expect(flatStyle(screen.getByText("Too long").props.style as StyleProp<TextStyle>).color).toBe(
      color.status.error,
    );
    expect(error).toBeTruthy();
    const column = error.parent;
    expect(column).toBeTruthy();
    let field = outline();
    while (field.parent && field.parent !== column) field = field.parent;
    expect(field.parent).toBe(column);
    const siblings = column?.children ?? [];
    expect(siblings.indexOf(error)).toBeGreaterThan(siblings.indexOf(field));
    await fireEvent(screen.getByLabelText("Name"), "focus");
    expect(flat(outline()).borderColor).toBe(color.status.error);
    expect(flat(outline()).borderWidth).toBe(border.widthFocused);
  });

  it("keeps the label as the accessible name and announces the error", async () => {
    await renderAndroid({ error: "Too long" });
    expect(screen.getByLabelText("Name").type).toBe("TextInput");
    expect(label().props.importantForAccessibility).toBe("no-hide-descendants");
    const error = screen.getByTestId("input-error-message");
    expect(error.props.accessibilityLiveRegion).toBe("polite");
    expect(error.props.accessibilityRole).toBe("alert");
    expect(within(screen.getByTestId("input-error")).getByText("Too long")).toBeTruthy();
  });

  it("keeps the eye toggle", async () => {
    await renderAndroid({ label: "Name", reveal, value: "x" });
    expect(screen.getByLabelText("Name").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByLabelText("Name").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
  });

  it("keeps multiline, resting the label on the first line", async () => {
    await renderAndroid({ multiline: true });
    expect(screen.getByLabelText("Name").props.multiline).toBe(true);
    expect(flat(label()).top).toBe(spacing.md);
  });

  it("draws the prefix only while the label is raised, outside the value", async () => {
    await renderAndroid({ prefix: "@" });
    expect(screen.queryByText("@")).toBeNull();
    await fireEvent(screen.getByLabelText("Name"), "focus");
    expect(screen.getByText("@")).toBeTruthy();
    expect(screen.getByLabelText("Name").props.value).toBe("");
  });
});

describe("Input announcements", () => {
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  beforeEach(() => {
    announce.mockClear();
  });

  it("announces the iOS error once when it appears, not on every render", async () => {
    const props = { reduceMotion: false, label: "Name", value: "", onChangeText: jest.fn() };
    await render(<Input {...props} />);
    expect(announce).not.toHaveBeenCalled();
    await screen.rerender(<Input {...props} error="Too long" />);
    await screen.rerender(<Input {...props} error="Too long" value="a" />);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Too long");
  });

  it("announces the same iOS error again on a new attempt", async () => {
    const props = { reduceMotion: false, label: "Name", value: "", onChangeText: jest.fn() };
    await render(<Input {...props} error="Taken" errorAttempt={1} />);
    await screen.rerender(<Input {...props} error="Taken" errorAttempt={1} />);
    expect(announce.mock.calls).toEqual([["Taken"]]);
    await screen.rerender(<Input {...props} error="Taken" errorAttempt={2} />);
    expect(announce.mock.calls).toEqual([["Taken"], ["Taken"]]);
  });

  it("announces a changed iOS error and stays quiet when it goes away", async () => {
    const props = { reduceMotion: false, label: "Name", value: "", onChangeText: jest.fn() };
    await render(<Input {...props} error="Too long" />);
    await screen.rerender(<Input {...props} error="Required" />);
    await screen.rerender(<Input {...props} />);
    expect(announce.mock.calls).toEqual([["Too long"], ["Required"]]);
  });

  it("exposes the iOS error as the hint of the text entry", async () => {
    await render(
      <Input
        reduceMotion={false}
        label="Name"
        value=""
        onChangeText={jest.fn()}
        error="Too long"
      />,
    );
    expect(screen.getByLabelText("Name").props.accessibilityHint).toBe("Too long");
  });

  it("has no hint without an error", async () => {
    await render(<Input reduceMotion={false} label="Name" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText("Name").props.accessibilityHint).toBeUndefined();
  });

  it("does not announce on Android, which keeps the alert live region", async () => {
    Platform.OS = "android";
    await render(
      <Input
        reduceMotion={false}
        label="Name"
        value=""
        onChangeText={jest.fn()}
        error="Too long"
      />,
    );
    expect(announce).not.toHaveBeenCalled();
    const error = screen.getByTestId("input-error-message");
    expect(error.props.accessibilityRole).toBe("alert");
    expect(error.props.accessibilityLiveRegion).toBe("polite");
  });
});
