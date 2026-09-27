// apps/mobile/test/workspace-packages.test.ts
//
// Tests that @beatly/core and @beatly/ui resolve from the app.
//
// Tested:
// - Resolves @beatly/core and @beatly/ui from the app
//
// What is covered:
// - Module resolution of both workspace packages through the pnpm
//   workspace's symlinks, as jest and tsc see them
//
// Run with: pnpm --filter @beatly/mobile test -- workspace-packages
//
// SEE: packages/core/src/index.ts, packages/ui/src/index.ts

import * as core from "@beatly/core";
import * as ui from "@beatly/ui";
import { describe, expect, it } from "@jest/globals";

describe("workspace packages", () => {
  it("resolves @beatly/core and @beatly/ui from the app", () => {
    expect(core).toBeDefined();
    expect(ui).toBeDefined();
    expect(typeof ui.color.surface.base).toBe("string");
  });
});
