// apps/mobile/test/app/index.test.tsx
//
// Tests for the index route.
//
// Tested:
// - Renders the showcase at the index route
// - Hides the stack header
//
// What is covered:
// - The route renders the showcase screen, and the stack's default header
//   (which would read "index") is hidden by the root layout
//
// Run with: pnpm --filter @beatly/mobile test -- index
//
// SEE: apps/mobile/app/index.tsx, apps/mobile/app/_layout.tsx

import { renderRouter, screen } from "expo-router/testing-library";
import { describe, expect, it } from "@jest/globals";

describe("the index route", () => {
  it("renders the showcase at the index route", async () => {
    await renderRouter("app", { initialUrl: "/" });

    expect(screen.getByTestId("showcase")).toBeTruthy();
  });

  it("hides the stack header", async () => {
    await renderRouter("app", { initialUrl: "/" });

    expect(screen.queryByText("index")).toBeNull();
  });
});
