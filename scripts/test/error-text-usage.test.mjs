// INFO: node --test guard for issue 158: no screen or ui component draws an error message as a loose <Text tone="error">; ErrorText is the only one. The matcher stops at the first ">", so a <Text> with an arrow-function prop before tone would hide a site (a false negative, never a false positive). It lives here because the mobile and ui programs have no Node types to read files with.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const roots = ["apps/mobile/src", "packages/ui/src/components"];
// The component that owns the error line.
const allowed = new Set(["packages/ui/src/components/ErrorText.tsx"]);
const LOOSE = /<Text\b[^>]*?\btone=(?:"error"|\{\s*"error"\s*\})/gs;

function looseErrorLines(source) {
  return [...source.matchAll(LOOSE)].map(
    (match) => source.slice(0, match.index).split("\n").length,
  );
}

describe("looseErrorLines", () => {
  it("finds a Text in the error tone, multiline too", () => {
    assert.deepEqual(looseErrorLines('a\n<Text variant="meta" tone="error">x</Text>'), [2]);
    assert.deepEqual(looseErrorLines('<Text tone={"error"}>x</Text>'), [1]);
    assert.deepEqual(looseErrorLines('<Text\n  variant="meta"\n  tone="error"\n>x</Text>'), [1]);
  });

  it("ignores what is not a loose error Text", () => {
    const ok = [
      '<Text tone={over ? "error" : "secondary"}>x</Text>',
      '<Notice tone="error" message="x" />',
      '<TextInput tone="error" />',
      '<ErrorText message="x" />',
    ];
    for (const source of ok) assert.deepEqual(looseErrorLines(source), []);
  });
});

describe("the source tree", () => {
  it("has no loose error Text outside ErrorText", () => {
    const found = [];
    for (const root of roots) {
      const files = readdirSync(path.join(repo, root), { recursive: true });
      for (const name of files) {
        const file = `${root}/${String(name)}`;
        if (!file.endsWith(".tsx") || allowed.has(file)) continue;
        for (const line of looseErrorLines(readFileSync(path.join(repo, file), "utf8"))) {
          found.push(`${file}:${line}`);
        }
      }
    }
    assert.deepEqual(found, []);
  });
});
