// packages/core/test/boundaries.test.ts
//
// Tests for the import boundaries of core, independent of the lint config.
//
// Tested:
// - every source file of core
// - the import extractor and the forbidden matcher
//
// What is covered:
// - core imports nothing from the platform, a native library or another workspace
//
// Run with: pnpm --filter @beatly/core test -- boundaries
//
// SEE: packages/core/src/index.ts

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const FORBIDDEN: RegExp[] = [
  /^react$/,
  /^react\//,
  /^react-dom$/,
  /^react-native$/,
  /^react-native\//,
  /^react-native-/,
  /^expo$/,
  /^expo-/,
  /^@expo\//,
  /^@supabase\//,
  /^@react-native-[^/]+\//,
  /^@tanstack\//,
  /^@beatly\/ui$/,
  /^@beatly\/mobile$/,
];

const IMPORT_FORMS: RegExp[] = [
  /\bimport\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+[^"'()]*?\s+from\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
];

function extractSpecifiers(source: string): string[] {
  const found: string[] = [];
  for (const form of IMPORT_FORMS) {
    for (const match of source.matchAll(form)) {
      if (match[1] !== undefined) found.push(match[1]);
    }
  }
  return found;
}

function isForbidden(specifier: string, fromDir: string): boolean {
  if (specifier.startsWith(".")) {
    const target = relative(SRC, resolve(fromDir, specifier));
    return target.startsWith("..");
  }
  return FORBIDDEN.some((pattern) => pattern.test(specifier));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

describe("core boundaries", () => {
  it("core source imports nothing from the platform or another workspace", () => {
    const offenders: string[] = [];
    for (const file of listFiles(SRC)) {
      for (const specifier of extractSpecifiers(readFileSync(file, "utf8"))) {
        if (isForbidden(specifier, dirname(file))) {
          offenders.push(`${relative(SRC, file)}: ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("detects every forbidden form of import", () => {
    const samples = [
      'import { View } from "react-native";',
      'import "expo-secure-store";',
      'export { x } from "react";',
      'const m = await import("@supabase/supabase-js");',
      'const r = require("expo-audio");',
      'import Svg from "react-native-svg";',
      'import { useQuery } from "@tanstack/react-query";',
      'import { y } from "../../../apps/mobile/x.ts";',
    ];
    for (const sample of samples) {
      const hits = extractSpecifiers(sample).filter((s) => isForbidden(s, SRC));
      expect(hits, sample).toHaveLength(1);
    }
  });

  it("scans at least the client and the ports", () => {
    const files = listFiles(SRC).map((file) => relative(SRC, file));
    expect(files).toContain(join("http", "client.ts"));
    expect(files).toContain(join("ports", "auth.ts"));
  });
});
