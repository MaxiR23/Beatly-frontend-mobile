// apps/mobile/test/app/index.test.tsx
//
// Tests for the single empty route.
//
// Tested:
// - Renders the root route on the base surface
// - Renders no visible text
//
// What is covered:
// - The dark background is drawn through the @beatly/ui token, and no
//   text node exists anywhere in the rendered tree (including the
//   stack header, which the root layout hides)
//
// Run with: pnpm --filter @beatly/mobile test -- index
//
// SEE: apps/mobile/app/index.tsx, apps/mobile/app/_layout.tsx

import { color } from "@beatly/ui";
import { renderRouter, screen } from "expo-router/testing-library";
import { describe, expect, it } from "@jest/globals";

describe("the root route", () => {
  it("renders the root route on the base surface", () => {
    renderRouter("app", { initialUrl: "/" });

    const view = screen.getByTestId("root-route");
    expect(view.props.style).toEqual({ flex: 1, backgroundColor: color.surface.base });
  });

  it("renders no visible text", () => {
    renderRouter("app", { initialUrl: "/" });

    expect(screen.queryByText(/./)).toBeNull();
  });
});
