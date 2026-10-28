// packages/ui/test/components/ColorFade.test.tsx
//
// Tests for the ColorFade layer.
//
// Tested:
// - ColorFade
//
// What is covered:
// - nothing drawn while the color is null; the layer at full opacity with the color there at mount, no timing
// - null to a color after mount: a timing to 1 over motion.duration.base on the native driver, starting from 0
// - reduce motion: the color applied at full opacity without a timing
// - a change between two colors at once, and back to null drawing nothing
//
// Run with: pnpm --filter @beatly/ui test -- ColorFade
//
// SEE: packages/ui/src/components/ColorFade.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Animated, View } from "react-native";

import { ColorFade } from "../../src/components/ColorFade.tsx";
import { motion } from "../../src/tokens/motion.ts";

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  timing.mockClear();
});

const element = (color: string | null, reduceMotion = false) => (
  <ColorFade color={color} reduceMotion={reduceMotion} testID="layer">
    {(c) => <View testID="fill" style={{ backgroundColor: c }} />}
  </ColorFade>
);

describe("ColorFade", () => {
  it("draws nothing while the color is null", async () => {
    await render(element(null));
    expect(screen.queryByTestId("layer")).toBeNull();
    expect(screen.queryByTestId("fill")).toBeNull();
  });

  it("draws the color at full opacity with no transition when it is there at mount", async () => {
    await render(element("#336699"));
    expect(screen.getByTestId("layer")).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId("fill")).toHaveStyle({ backgroundColor: "#336699" });
    expect(timing).not.toHaveBeenCalled();
  });

  it("fades the color in over motion.duration.base when it arrives after mount", async () => {
    const view = await render(element(null));
    await view.rerender(element("#336699"));
    expect(screen.getByTestId("fill")).toHaveStyle({ backgroundColor: "#336699" });
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
    expect(screen.getByTestId("layer")).toHaveStyle({ opacity: 0 });
  });

  it("applies the color at once under reduce motion", async () => {
    const view = await render(element(null, true));
    await view.rerender(element("#336699", true));
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByTestId("layer")).toHaveStyle({ opacity: 1 });
  });

  it("switches between two colors at once", async () => {
    const view = await render(element("#336699"));
    await view.rerender(element("#993366"));
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByTestId("layer")).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId("fill")).toHaveStyle({ backgroundColor: "#993366" });
  });

  it("draws nothing again when the color goes back to null", async () => {
    const view = await render(element("#336699"));
    await view.rerender(element(null));
    expect(screen.queryByTestId("layer")).toBeNull();
  });
});
