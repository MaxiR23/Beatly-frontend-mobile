// apps/mobile/test/screens/player/playerRoute.test.ts
//
// Tests for the player route options.
//
// Tested:
// - playerRouteOptions
//
// What is covered:
// - a see-through modal that slides; a fade under reduce motion
//
// Run with: pnpm --filter @beatly/mobile test -- playerRoute
//
// SEE: apps/mobile/src/screens/player/playerRoute.ts

import { color } from "@beatly/ui";
import { describe, expect, it } from "@jest/globals";

import { playerRouteOptions } from "../../../src/screens/player/playerRoute.ts";

describe("playerRouteOptions", () => {
  it("slides as a see-through modal", () => {
    expect(playerRouteOptions(false)).toEqual({
      presentation: "transparentModal",
      animation: "slide_from_bottom",
      contentStyle: { backgroundColor: color.overlay.clear },
    });
  });

  it("fades under reduce motion", () => {
    const options = playerRouteOptions(true);
    expect(options.animation).toBe("fade");
    expect(options.presentation).toBe("transparentModal");
  });
});
