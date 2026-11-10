// INFO: node --test over check_path_allowed of scripts/ship.sh. The function is
// cut out of the script and run inside a throwaway git repo, so ship.sh itself
// never runs.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../ship.sh");
const source = readFileSync(script, "utf8");
const start = source.indexOf("check_path_allowed() {");
const end = source.indexOf("\nstage_paths() {");
const fn = source.slice(start, end);

let repo;
const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" });

before(() => {
  repo = mkdtempSync(path.join(tmpdir(), "ship-"));
  git("init", "-q");
  git("config", "user.email", "t@t.t");
  git("config", "user.name", "t");
  writeFileSync(path.join(repo, "pnpm-lock.yaml"), "a\n");
  writeFileSync(path.join(repo, "pnpm-workspace.yaml"), "a\n");
  writeFileSync(path.join(repo, "package.json"), "{}\n");
  git("add", ".");
  git("commit", "-q", "-m", "init");
});
after(() => {
  rmSync(repo, { recursive: true, force: true });
});

const check = (p) =>
  spawnSync(
    "bash",
    ["-c", `die() { echo "ship: $*" >&2; exit 1; }\n${fn}\ncheck_path_allowed "$1"`, "bash", p],
    { cwd: repo, encoding: "utf8" },
  );

describe("check_path_allowed and pnpm-lock.yaml", () => {
  it("refuses the lockfile when no manifest changed", () => {
    const r = check("pnpm-lock.yaml");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /without any package\.json or pnpm-workspace\.yaml/);
  });

  it("accepts the lockfile when pnpm-workspace.yaml changed", () => {
    writeFileSync(path.join(repo, "pnpm-workspace.yaml"), "b\n");
    assert.equal(check("pnpm-lock.yaml").status, 0);
    git("checkout", "--", "pnpm-workspace.yaml");
  });

  it("accepts the lockfile when a package.json changed", () => {
    writeFileSync(path.join(repo, "package.json"), '{"a":1}\n');
    assert.equal(check("pnpm-lock.yaml").status, 0);
    git("checkout", "--", "package.json");
  });
});
