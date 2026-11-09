// INFO: node --test guard for issue 163: the ui ErrorState is drawn only by the FailureState wrapper (and by the ui DetailScreen), every ErrorState and FailureState tag carries a cause, and every route of the root stack exports ErrorBoundary. The tag scanner balances braces, so an arrow function in a prop never ends the tag early. It lives here because the mobile and ui programs have no Node types to read files with.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Where each component may be drawn.
const errorStateHomes = new Set([
  "apps/mobile/src/screens/failure/FailureState.tsx",
  "packages/ui/src/components/DetailScreen.tsx",
]);
const roots = ["apps/mobile/src", "packages/ui/src/components"];
const TAG = /<(ErrorState|FailureState)\b/g;

// The tags of the two components in a source: their name, line and the text between the name and the end of the tag.
function tagsOf(source) {
  const tags = [];
  for (const match of source.matchAll(TAG)) {
    let depth = 0;
    let end = match.index + match[0].length;
    for (; end < source.length; end += 1) {
      const char = source[end];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0) break;
    }
    tags.push({
      name: match[1],
      line: source.slice(0, match.index).split("\n").length,
      props: source.slice(match.index + match[0].length, end),
    });
  }
  return tags;
}

const hasCause = (tag) => /\bcause=/.test(tag.props);

function sourceFiles() {
  const files = [];
  for (const root of roots) {
    for (const name of readdirSync(path.join(repo, root), { recursive: true })) {
      const file = `${root}/${String(name)}`;
      if (file.endsWith(".tsx")) files.push(file);
    }
  }
  return files;
}

describe("tagsOf", () => {
  it("reads a multiline tag with an arrow function before the cause", () => {
    const source = "<FailureState\n  onRetry={() => void q.refetch()}\n  cause={cause}\n/>";
    const [tag] = tagsOf(source);
    assert.equal(tag.name, "FailureState");
    assert.equal(tag.line, 1);
    assert.equal(hasCause(tag), true);
  });

  it("finds a tag with no cause", () => {
    const [tag] = tagsOf('<ErrorState message="x" onRetry={() => undefined} />');
    assert.equal(hasCause(tag), false);
  });

  it("does not read a component whose name only starts the same", () => {
    assert.deepEqual(tagsOf("<ErrorStateful cause={x} />"), []);
  });
});

describe("the source tree", () => {
  it("draws ErrorState only in FailureState and DetailScreen", () => {
    const found = [];
    for (const file of sourceFiles()) {
      if (errorStateHomes.has(file)) continue;
      for (const tag of tagsOf(readFileSync(path.join(repo, file), "utf8"))) {
        if (tag.name === "ErrorState") found.push(`${file}:${tag.line}`);
      }
    }
    assert.deepEqual(found, []);
  });

  it("gives every ErrorState and FailureState a cause", () => {
    const found = [];
    for (const file of sourceFiles()) {
      for (const tag of tagsOf(readFileSync(path.join(repo, file), "utf8"))) {
        if (!hasCause(tag)) found.push(`${file}:${tag.line}`);
      }
    }
    assert.deepEqual(found, []);
  });

  it("exports ErrorBoundary from every route of the root stack", () => {
    const app = path.join(repo, "apps/mobile/app");
    const routes = readdirSync(app, { withFileTypes: true })
      .filter(
        (entry) => entry.isFile() && entry.name.endsWith(".tsx") && entry.name !== "_layout.tsx",
      )
      .map((entry) => `apps/mobile/app/${entry.name}`);
    routes.push("apps/mobile/app/auth/callback.tsx", "apps/mobile/app/(tabs)/_layout.tsx");
    const missing = routes.filter(
      (file) =>
        !existsSync(path.join(repo, file)) ||
        !/export \{[^}]*\bas ErrorBoundary\b[^}]*\}/.test(
          readFileSync(path.join(repo, file), "utf8"),
        ),
    );
    assert.deepEqual(missing, []);
  });
});
