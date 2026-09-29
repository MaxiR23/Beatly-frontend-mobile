// apps/mobile/test/i18n-parity.test.ts
//
// Tests that es and en ship the same translations.
//
// Tested:
// - The i18n resources
//
// What is covered:
// - Same namespaces, same keys per namespace, and no empty string
//
// Run with: pnpm --filter @beatly/mobile test -- i18n-parity
//
// SEE: apps/mobile/src/i18n/resources.ts

import { describe, expect, it } from "@jest/globals";

import { resources } from "../src/i18n/resources.ts";
import { flattenKeys } from "./helpers/flattenKeys.ts";

describe("i18n parity", () => {
  it("ships the same namespaces in es and en", () => {
    expect(Object.keys(resources.es).sort()).toEqual(Object.keys(resources.en).sort());
  });

  it("ships the same keys in es and en for every namespace", () => {
    for (const ns of Object.keys(resources.en) as (keyof typeof resources.en)[]) {
      expect(flattenKeys(resources.es[ns]).sort()).toEqual(flattenKeys(resources.en[ns]).sort());
    }
  });

  it("has no empty string in either language", () => {
    for (const lang of ["es", "en"] as const) {
      for (const ns of Object.keys(resources[lang]) as (keyof (typeof resources)[typeof lang])[]) {
        const text = JSON.stringify(resources[lang][ns]);
        expect(text).not.toContain('""');
      }
    }
  });
});
