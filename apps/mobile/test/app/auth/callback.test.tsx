// apps/mobile/test/app/auth/callback.test.tsx
//
// Tests for the email callback route.
//
// Tested:
// - the auth/callback route
//
// What is covered:
// - signed out, the callback route draws its screen: it is not guarded
//
// Run with: pnpm --filter @beatly/mobile test -- callback
//
// SEE: apps/mobile/app/auth/callback.tsx, apps/mobile/app/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { renderRouter, screen } from "expo-router/testing-library";

import { installCore } from "../../helpers/routeCore.ts";

jest.mock("../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

describe("the auth callback route", () => {
  it("draws the callback screen when signed out", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/auth/callback?token_hash=abc&type=signup" });
    expect(await screen.findByTestId("authCallback")).toBeTruthy();
  });
});
