// INFO: node --test over scripts/gate-limit.mjs. Each case feeds a stdin
// fixture shaped like the PreToolUse, PostToolUse or PostToolUseFailure hook
// input and checks the output and the records under .claude/loop/.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../gate-limit.mjs");

const TYPE_ERRORS =
  "src/a.ts(1,1): error TS2345: bad\nsrc/b.ts(2,2): error TS2304: worse\nsrc/c.ts(3,3): error TS2375: x\n";
const ONE_TYPE_ERROR = "src/a.ts(1,1): error TS2345: bad\n";
const LINT_PROBLEMS = "\u001b[31m✖ 10 problems (8 errors, 2 warnings)\u001b[39m\n";
const PRETTIER =
  "[warn] a.ts\n[warn] b.ts\n[warn] Code style issues found in 2 files. Run Prettier.\n";
const JEST_FAIL = "Tests:       3 failed, 1100 passed, 1103 total\n";
const VITEST_FAIL = " Tests  2 failed | 800 passed (802)\n";
const NODE_FAIL = "# tests 11\n# fail 1\n";
const NODE_SPEC_FAIL =
  "✖ b (0.27ms)\nℹ tests 2\nℹ suites 0\nℹ pass 1\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 39.09\n";
const CORE_TYPE_ERRORS = "packages/core typecheck: src/a.ts(1,1): error TS2345: bad\n";
const UI_TYPE_ERRORS =
  "packages/core typecheck: Done\npackages/ui typecheck: src/a.ts(1,1): error TS2345: bad\npackages/ui typecheck: src/b.ts(1,1): error TS2345: bad\npackages/ui typecheck: src/c.ts(1,1): error TS2345: bad\n";
const CORE_JEST = "packages/core test:  Tests  2 failed | 800 passed (802)\n";
const MOBILE_JEST = "apps/mobile test: Tests:       5 failed, 1100 passed, 1105 total\n";
const SUITE_FAIL = "Test Suites: 1 failed, 40 passed, 41 total\nTests:       0 total\n";

let projectDir;
before(() => {
  projectDir = mkdtempSync(path.join(tmpdir(), "gate-limit-"));
});
after(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

function spawn(input) {
  const result = spawnSync("node", [script], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function run(
  command,
  { agentType = "implement-issue", agentId = "agent-a", extra = { timeout: 600000 } } = {},
) {
  const stdout = spawn({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command, ...extra },
    ...(agentType ? { agent_type: agentType, agent_id: agentId } : {}),
  });
  if (stdout === "") return { denied: false };
  const out = JSON.parse(stdout).hookSpecificOutput;
  assert.equal(out.hookEventName, "PreToolUse");
  return { denied: out.permissionDecision === "deny", reason: out.permissionDecisionReason };
}

function post(
  output,
  {
    event = "PostToolUseFailure",
    agentType = "implement-issue",
    agentId = "agent-a",
    command = "pnpm gate",
  } = {},
) {
  const stdout = spawn({
    hook_event_name: event,
    tool_name: "Bash",
    tool_input: { command, timeout: 600000 },
    ...(event === "PostToolUse"
      ? { tool_response: { stdout: output, stderr: "" } }
      : { error: output }),
    ...(agentType ? { agent_type: agentType, agent_id: agentId } : {}),
  });
  assert.equal(stdout, "");
}

function file(id) {
  return path.join(projectDir, ".claude", "loop", `gate-count-${id}.json`);
}

function count(id) {
  return existsSync(file(id)) ? JSON.parse(readFileSync(file(id), "utf8")).count : 0;
}

function results(id) {
  return JSON.parse(readFileSync(file(id), "utf8")).results;
}

// One attempt: the gate call, then its recorded output.
function attempt(id, output) {
  const pre = run("pnpm gate", { agentId: id });
  if (!pre.denied) post(output, { agentId: id });
  return pre;
}

describe("gate-limit", () => {
  it("lets three gate calls run and blocks the fourth when nothing was recorded", () => {
    for (let i = 0; i < 3; i += 1)
      assert.equal(run("pnpm gate", { agentId: "limit" }).denied, false);
    const fourth = run("pnpm gate", { agentId: "limit" });
    assert.equal(fourth.denied, true);
    assert.match(fourth.reason, /STOP/);
    assert.match(fourth.reason, /what fails/);
    assert.match(fourth.reason, /what you tried/);
  });

  it("counts `run`, `cd <repo> &&` and `2>&1` forms as gate calls", () => {
    const id = "forms";
    assert.equal(run("pnpm run gate", { agentId: id }).denied, false);
    assert.equal(run("cd /repo && pnpm gate", { agentId: id }).denied, false);
    assert.equal(run('cd "/my repo" && pnpm gate 2>&1', { agentId: id }).denied, false);
    assert.equal(count(id), 3);
  });

  it("denies a gate that is chained, piped or redirected, without counting", () => {
    const id = "alone";
    for (const command of [
      "pnpm gate 2>&1 | tail",
      "pnpm gate | tail -20",
      "pnpm gate > out.txt",
      "pnpm gate; echo done",
      "pnpm gate && echo ok",
      "echo x && pnpm gate",
      "cd /repo && pnpm lint && pnpm gate",
      "pnpm exec prettier --write x && pnpm gate",
      "cd /repo&&true&&pnpm gate",
      "cd x;true && pnpm gate",
    ]) {
      const result = run(command, { agentId: id });
      assert.equal(result.denied, true, command);
      assert.match(result.reason, /alone/, command);
      assert.match(result.reason, /timeout: 600000/, command);
    }
    assert.equal(count(id), 0);
  });

  it("denies a gate with a missing or short timeout, without counting", () => {
    const id = "timeout";
    for (const extra of [{}, { timeout: 120000 }, { timeout: 599999 }]) {
      const result = run("pnpm gate", { agentId: id, extra });
      assert.equal(result.denied, true, JSON.stringify(extra));
      assert.match(result.reason, /timeout of at least 600000/);
    }
    assert.equal(run("pnpm gate", { agentId: id }).denied, false);
    assert.equal(count(id), 1);
  });

  it("denies a gate in the background, without counting", () => {
    const id = "background";
    const result = run("pnpm gate", {
      agentId: id,
      extra: { timeout: 600000, run_in_background: true },
    });
    assert.equal(result.denied, true);
    assert.match(result.reason, /background/);
    assert.match(result.reason, /timeout: 600000/);
    assert.equal(count(id), 0);
  });

  it("blocks the gate's parts at the root, with or without run", () => {
    for (const part of ["typecheck", "lint", "test"]) {
      assert.equal(run(`pnpm ${part}`).denied, true, part);
      assert.equal(run(`pnpm run ${part}`).denied, true, `run ${part}`);
    }
    assert.equal(run("pnpm test -- foo 2>&1 | tail").denied, true);
    assert.equal(run("pnpm test", { extra: {} }).denied, true);
  });

  it("blocks root-wide flag forms of the parts", () => {
    for (const command of [
      "pnpm -r run typecheck",
      "pnpm -r --if-present run test",
      "pnpm -w test",
    ])
      assert.equal(run(command).denied, true, command);
  });

  it("suggests an existing command for a blocked lint", () => {
    assert.match(run("pnpm lint").reason, /pnpm exec eslint <path>/);
    assert.doesNotMatch(run("pnpm lint").reason, /--filter <pkg> lint/);
  });

  it("does not count or block text that only mentions the gate or its parts", () => {
    const id = "text";
    for (const command of [
      'grep -n "pnpm gate" CLAUDE.md',
      "grep -n 'pnpm gate' x",
      "echo pnpm gate",
      'grep -rn "pnpm test" docs/testing.md',
      'rg "pnpm typecheck" .',
    ])
      assert.equal(run(command, { agentId: id }).denied, false, command);
    assert.equal(existsSync(file(id)), false);
    for (let i = 0; i < 3; i += 1) assert.equal(run("pnpm gate", { agentId: id }).denied, false);
  });

  it("blocked parts do not consume gate attempts", () => {
    const id = "parts";
    run("pnpm lint", { agentId: id });
    for (let i = 0; i < 3; i += 1) assert.equal(run("pnpm gate", { agentId: id }).denied, false);
  });

  it("lets workspace and file scoped commands run", () => {
    for (const command of [
      "pnpm --filter @beatly/mobile test -- SomeScreen",
      "pnpm --filter @beatly/core test",
      "pnpm exec jest apps/mobile/test/foo.test.tsx",
      "pnpm format",
      "pnpm exec commitlint --help",
      "git status",
    ]) {
      assert.equal(run(command, { agentId: "scoped", extra: {} }).denied, false, command);
    }
  });

  it("never limits the main session or other agents", () => {
    for (let i = 0; i < 8; i += 1) {
      assert.equal(run("pnpm gate 2>&1 | tail", { agentType: null, extra: {} }).denied, false);
      assert.equal(
        run("pnpm gate | tail", { agentType: "review-changes", agentId: "r", extra: {} }).denied,
        false,
      );
    }
    assert.equal(run("pnpm test", { agentType: null }).denied, false);
  });

  it("ignores non-Bash tools", () => {
    const stdout = spawn({
      tool_name: "Read",
      tool_input: { file_path: "pnpm gate" },
      agent_type: "implement-issue",
      agent_id: "read",
    });
    assert.equal(stdout, "");
  });
});

describe("gate-limit progress", () => {
  it("records stage and failures for each kind of failure", () => {
    const cases = [
      [TYPE_ERRORS, { stage: "typecheck", step: 0, failures: 3 }],
      [UI_TYPE_ERRORS, { stage: "typecheck", step: 2, failures: 3 }],
      [LINT_PROBLEMS, { stage: "lint", step: 1, failures: 10 }],
      [PRETTIER, { stage: "lint", step: 2, failures: 2 }],
      [`${LINT_PROBLEMS}${PRETTIER}`, { stage: "lint", step: 1, failures: 12 }],
      [JEST_FAIL, { stage: "test", step: 0, failures: 3 }],
      [MOBILE_JEST, { stage: "test", step: 3, failures: 5 }],
      [VITEST_FAIL, { stage: "test", step: 0, failures: 2 }],
      [NODE_FAIL, { stage: "test", step: 4, failures: 1 }],
      [NODE_SPEC_FAIL, { stage: "test", step: 4, failures: 1 }],
      [SUITE_FAIL, { stage: "test", step: 0, failures: 1 }],
    ];
    cases.forEach(([output, expected], index) => {
      const id = `rec-${index}`;
      run("pnpm gate", { agentId: id });
      post(output, { agentId: id });
      assert.deepEqual(results(id), [expected], output);
    });
  });

  it("records an unreadable output as null", () => {
    run("pnpm gate", { agentId: "unreadable" });
    post("ELIFECYCLE something odd", { agentId: "unreadable" });
    assert.deepEqual(results("unreadable"), [null]);
  });

  it("removes the records when the gate passes", () => {
    run("pnpm gate", { agentId: "pass" });
    post("all green", { event: "PostToolUse", agentId: "pass" });
    assert.equal(existsSync(file("pass")), false);
  });

  it("lets the fourth attempt run after progress to a later stage", () => {
    const id = "later";
    attempt(id, TYPE_ERRORS);
    attempt(id, TYPE_ERRORS);
    attempt(id, LINT_PROBLEMS);
    assert.equal(attempt(id, JEST_FAIL).denied, false);
    assert.equal(count(id), 4);
  });

  it("lets the fourth attempt run after progress with fewer failures in the same stage", () => {
    const id = "fewer";
    attempt(id, TYPE_ERRORS);
    attempt(id, TYPE_ERRORS);
    attempt(id, ONE_TYPE_ERROR);
    assert.equal(attempt(id, ONE_TYPE_ERROR).denied, false);
  });

  it("counts a later step in the same stage as progress, even with more failures", () => {
    const id = "step";
    attempt(id, CORE_TYPE_ERRORS);
    attempt(id, CORE_TYPE_ERRORS);
    attempt(id, UI_TYPE_ERRORS);
    assert.equal(run("pnpm gate", { agentId: id }).denied, false);
    const test = "step-test";
    attempt(test, CORE_JEST);
    attempt(test, CORE_JEST);
    attempt(test, MOBILE_JEST);
    assert.equal(run("pnpm gate", { agentId: test }).denied, false);
    const node = "step-node";
    attempt(node, MOBILE_JEST);
    attempt(node, MOBILE_JEST);
    attempt(node, NODE_SPEC_FAIL);
    assert.equal(run("pnpm gate", { agentId: node }).denied, false);
  });

  it("denies the fourth attempt with no progress, says to stop and report, and stays denied", () => {
    const id = "stuck";
    attempt(id, TYPE_ERRORS);
    attempt(id, TYPE_ERRORS);
    attempt(id, TYPE_ERRORS);
    const fourth = attempt(id, TYPE_ERRORS);
    assert.equal(fourth.denied, true);
    assert.match(fourth.reason, /no progress/);
    assert.match(fourth.reason, /STOP/);
    assert.match(fourth.reason, /what fails/);
    assert.match(fourth.reason, /why/);
    assert.match(fourth.reason, /what you tried/);
    assert.equal(existsSync(file(id)), true);
    assert.equal(run("pnpm gate", { agentId: id }).denied, true);
    assert.equal(run("pnpm gate", { agentId: id }).denied, true);
  });

  it("treats the same failures, a lower stage or an unreadable output as no progress", () => {
    const stuck = [
      [TYPE_ERRORS, TYPE_ERRORS, "ELIFECYCLE odd"],
      [LINT_PROBLEMS, LINT_PROBLEMS, TYPE_ERRORS],
      [ONE_TYPE_ERROR, ONE_TYPE_ERROR, TYPE_ERRORS],
      ["odd", "odd", "odd"],
    ];
    stuck.forEach((outputs, index) => {
      const id = `stuck-${index}`;
      outputs.forEach((output) => attempt(id, output));
      assert.equal(run("pnpm gate", { agentId: id }).denied, true, id);
    });
  });

  it("allows up to six attempts while progressing and always denies the seventh", () => {
    const id = "cap";
    const outputs = [TYPE_ERRORS, TYPE_ERRORS, ONE_TYPE_ERROR, LINT_PROBLEMS, PRETTIER, JEST_FAIL];
    outputs.forEach((output, index) =>
      assert.equal(attempt(id, output).denied, false, `attempt ${index + 1}`),
    );
    assert.equal(count(id), 6);
    const seventh = run("pnpm gate", { agentId: id });
    assert.equal(seventh.denied, true);
    assert.match(seventh.reason, /cap/);
    assert.match(seventh.reason, /STOP/);
    assert.match(seventh.reason, /what you tried/);
    assert.equal(run("pnpm gate", { agentId: id }).denied, true);
    assert.equal(run("pnpm gate", { agentId: id }).denied, true);
  });

  it("removes the records when the agent stops, and only its own", () => {
    for (let i = 0; i < 4; i += 1) attempt("gone", TYPE_ERRORS);
    run("pnpm gate", { agentId: "kept" });
    assert.equal(existsSync(file("gone")), true);
    const stdout = spawn({
      hook_event_name: "SubagentStop",
      agent_type: "implement-issue",
      agent_id: "gone",
    });
    assert.equal(stdout, "");
    assert.equal(existsSync(file("gone")), false);
    assert.equal(existsSync(file("kept")), true);
    assert.equal(run("pnpm gate", { agentId: "gone" }).denied, false);
  });

  it("ignores the stop of other agents", () => {
    run("pnpm gate", { agentId: "other-stop" });
    spawn({
      hook_event_name: "SubagentStop",
      agent_type: "review-changes",
      agent_id: "other-stop",
    });
    assert.equal(existsSync(file("other-stop")), true);
  });

  it("starts a new agent_id from zero", () => {
    for (let i = 0; i < 3; i += 1) attempt("old", TYPE_ERRORS);
    assert.equal(attempt("old", TYPE_ERRORS).denied, true);
    assert.equal(run("pnpm gate", { agentId: "fresh" }).denied, false);
    assert.equal(count("fresh"), 1);
  });

  it("never records the main session or other agents", () => {
    post(TYPE_ERRORS, { agentType: null });
    post(TYPE_ERRORS, { agentType: "review-changes", agentId: "rev" });
    assert.equal(existsSync(file("rev")), false);
  });

  it("ignores post events of commands that are not the gate", () => {
    run("pnpm gate", { agentId: "other" });
    post(TYPE_ERRORS, { agentId: "other", command: "pnpm --filter @beatly/core test" });
    assert.deepEqual(results("other"), []);
  });
});
