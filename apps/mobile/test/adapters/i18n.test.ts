// apps/mobile/test/adapters/i18n.test.ts
//
// Tests for the i18n adapter.
//
// Tested:
// - The exported i18n instance
//
// What is covered:
// - Every key of every namespace resolves to its value in es and en
// - An unsupported language falls back to en
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/i18n
//
// SEE: apps/mobile/src/adapters/i18n.ts

import { afterEach, describe, expect, it } from "@jest/globals";

import { i18n } from "../../src/adapters/i18n.ts";
import { resources } from "../../src/i18n/resources.ts";
import { flattenKeys, valueAt } from "../helpers/flattenKeys.ts";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("i18n adapter", () => {
  for (const lang of ["es", "en"] as const) {
    it(`resolves every key of every namespace in ${lang}`, () => {
      for (const ns of Object.keys(resources[lang]) as (keyof (typeof resources)[typeof lang])[]) {
        const t = i18n.getFixedT(lang, ns);
        for (const key of flattenKeys(resources[lang][ns])) {
          expect(t(key as never)).toBe(valueAt(resources[lang][ns], key));
        }
      }
    });
  }

  it("falls back to en for an unsupported language", async () => {
    await i18n.changeLanguage("fr");

    expect(i18n.t("retry")).toBe(resources.en.common.retry);
  });
});
