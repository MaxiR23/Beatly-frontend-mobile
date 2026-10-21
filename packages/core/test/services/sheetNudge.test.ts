// packages/core/test/services/sheetNudge.test.ts
//
// Tests for the sheet nudge service.
//
// Tested:
// - take says a track nudges the first time it is asked for, and not again
//
// What is covered:
// - the first take of a track, the same track again, another track, a new service (an app restart) remembering none
// - Not applicable: expected empty, ok:false reasons and transport failures, because the service calls no port
//
// Run with: pnpm --filter @beatly/core test -- sheetNudge
//
// SEE: packages/core/src/services/sheetNudge.ts
import { describe, expect, it } from "vitest";

import { createSheetNudgeService } from "../../src/services/sheetNudge.ts";

describe("take", () => {
  it("nudges the first time a track is asked for", () => {
    expect(createSheetNudgeService().take("t1")).toBe(true);
  });

  it("does not nudge a track again", () => {
    const service = createSheetNudgeService();
    service.take("t1");
    expect(service.take("t1")).toBe(false);
    expect(service.take("t1")).toBe(false);
  });

  it("nudges another track", () => {
    const service = createSheetNudgeService();
    service.take("t1");
    expect(service.take("t2")).toBe(true);
    expect(service.take("t1")).toBe(false);
  });

  it("remembers nothing in a new service, as after an app restart", () => {
    createSheetNudgeService().take("t1");
    expect(createSheetNudgeService().take("t1")).toBe(true);
  });
});
