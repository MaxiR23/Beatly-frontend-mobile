#!/usr/bin/env node
// INFO: hook on Bash (and SubagentStop) that limits the gate of implement-issue (CLAUDE.md,
// docs/workflow.md). It reads the hook input from stdin and acts only when
// agent_type is "implement-issue": the main session, scripts/ship.sh and
// every other agent pass untouched.
//
// PreToolUse, for that agent:
// - The gate (`pnpm gate`, or `pnpm run gate`) must run alone: only
//   `cd <repo> &&` before it and only `2>&1` after it, foreground, with a
//   `timeout` of at least 600000 ms. Anything else is denied without
//   counting an attempt, with a message that says how to run it. Chained or
//   redirected, a failed edit is followed by a gate run over the old code and
//   a pipe hides the output the progress check reads; with the default 120 s
//   timeout a slow run moves to the background with no verdict.
// - It also denies the gate's parts at the root (`pnpm typecheck`,
//   `pnpm lint`, `pnpm test`, with or without `run`), so the limit cannot be
//   dodged one part at a time. Commands scoped to a workspace or a file
//   (`pnpm --filter ...`, `pnpm exec ...`, `pnpm format`) stay allowed.
// - Attempts 1 to 3 always run. From the fourth, the gate runs only if the
//   last attempt made progress over the one before (a later stage, a later
//   step in the same stage, or the same step with fewer failures); an
//   unreadable output is no progress. Absolute cap: 6 attempts. A denial for
//   no progress or the cap is sticky: it stays in force for that agent_id, so
//   every later gate call of the run is denied too.
//
// PostToolUse and PostToolUseFailure read the gate output and record, per
// agent_id under .claude/loop/ (not versioned), the stage reached and its
// failures. A pass removes the records. SubagentStop removes the records of the
// agent that stops, so they never accumulate; a denial does not remove them,
// it marks them stopped.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AGENT = "implement-issue";
export const FREE_ATTEMPTS = 3;
export const CAP = 6;
export const MIN_TIMEOUT = 600000;
export const STAGES = { typecheck: 1, lint: 2, test: 3 };
// INFO: steps inside a stage. `pnpm -r` stops at the first failing workspace,
// in this order, and `node --test` runs after them; in lint, eslint runs
// before prettier. Fixing one step and exposing the next is progress.
const WORKSPACES = { "packages/core": 1, "packages/ui": 2, "apps/mobile": 3 };
const NODE_STEP = 4;

// INFO: `pnpm` only counts in command position (start of the command or right
// after ; & | ( or a newline), so a grep pattern or an echo argument that
// mentions it does not. Root-wide flags before the script name are skipped;
// `--filter` is not in the list, so scoped commands stay allowed.
const HEAD = String.raw`(?:^|[;&|(\n])\s*pnpm`;
const ROOT_FLAGS = String.raw`(?:\s+(?:-r|-w|--recursive|--workspace-root|--if-present|--silent|-s))*`;
const GATE = new RegExp(String.raw`${HEAD}${ROOT_FLAGS}\s+(?:run\s+)?gate(?![\w:-])`);
const PART = new RegExp(
  String.raw`${HEAD}${ROOT_FLAGS}\s+(?:run\s+)?(typecheck|lint|test)(?![\w:-])`,
);

export function classify(command) {
  if (GATE.test(command)) return { kind: "gate" };
  const part = PART.exec(command);
  if (part) return { kind: "part", part: part[1] };
  return { kind: "other" };
}

const ALONE = new RegExp(
  String.raw`^\s*(?:cd\s+(?:"[^"]*"|'[^']*'|[^\s;&|<>()$"']+)\s*&&\s*)?pnpm\s+(?:run\s+)?gate(?:\s+2>&1)?\s*$`,
);
const HOW =
  "Run it as `pnpm gate` alone (only `cd <repo> &&` before and `2>&1` after, no pipe, redirect or other command), in the foreground, with `timeout: 600000`.";

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function hint(part) {
  if (part === "lint") return "`pnpm exec eslint <path>`";
  return `\`pnpm --filter <pkg> ${part}\`, \`pnpm exec ...\``;
}

function recordFile(input, projectDir) {
  const id = String(input.agent_id ?? "unknown").replace(/[^\w-]/g, "_");
  return path.join(projectDir, ".claude", "loop", `gate-count-${id}.json`);
}

function readRecord(file) {
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return {
      count: Number.isInteger(data.count) ? data.count : 0,
      results: Array.isArray(data.results) ? data.results : [],
      stopped: data.stopped === "cap" || data.stopped === "no-progress" ? data.stopped : null,
    };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { count: 0, results: [], stopped: null };
  }
}

function writeRecord(file, record) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(record));
}

// A result is { stage, failures } with stage in STAGES, or null when the
// output could not be read.
function progressed(last, before) {
  if (!last || !before) return false;
  const a = STAGES[last.stage];
  const b = STAGES[before.stage];
  if (a === undefined || b === undefined) return false;
  if (a !== b) return a > b;
  const stepA = last.step ?? 0;
  const stepB = before.step ?? 0;
  if (stepA !== stepB) return stepA > stepB;
  return last.failures < before.failures;
}

// Returns the hook output object to print, or null to let the call pass.
export function decide(input, projectDir) {
  if (input?.agent_type !== AGENT) return null;
  if (input.tool_name !== undefined && input.tool_name !== "Bash") return null;
  const command = input.tool_input?.command;
  if (typeof command !== "string") return null;

  const found = classify(command);
  if (found.kind === "other") return null;

  if (found.kind === "part") {
    return deny(
      `Blocked: \`pnpm ${found.part}\` at the root is part of the gate, and the gate is limited per run. Run \`pnpm gate\` last and alone, or scope the command to a workspace or a file (${hint(found.part)}).`,
    );
  }

  if (input.tool_input?.run_in_background === true) {
    return deny(`Blocked: the gate cannot run in the background: you would get no verdict. ${HOW}`);
  }
  if (!ALONE.test(command)) {
    return deny(`Blocked: the gate must run alone, and this call is not just the gate. ${HOW}`);
  }
  const timeout = input.tool_input?.timeout;
  if (typeof timeout !== "number" || timeout < MIN_TIMEOUT) {
    return deny(
      `Blocked: the gate needs a timeout of at least ${MIN_TIMEOUT} ms; with the default one a slow run moves to the background with no verdict. ${HOW}`,
    );
  }

  const file = recordFile(input, projectDir);
  const record = readRecord(file);
  const { count, results } = record;
  if (record.stopped === "cap" || (!record.stopped && count >= CAP)) {
    writeRecord(file, { count, results, stopped: "cap" });
    return deny(
      `Blocked: the gate already ran ${CAP} times in this run, the absolute cap. STOP retrying: do not run it again. Hand back with what fails (the failing output), why, and what you tried, and the next stage per "The local gate".`,
    );
  }
  if (
    record.stopped === "no-progress" ||
    (count >= FREE_ATTEMPTS && !progressed(results[count - 1], results[count - 2]))
  ) {
    writeRecord(file, { count, results, stopped: "no-progress" });
    return deny(
      `Blocked: the last gate run made no progress over the one before (no later stage, no fewer failures, or its output could not be read). STOP retrying: do not run it again. Hand back with what fails (the failing output), why, and what you tried, and the next stage per "The local gate".`,
    );
  }
  writeRecord(file, { count: count + 1, results });
  return null;
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g");

function collectText(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectText(item, out);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) collectText(item, out);
  return out;
}

function sum(text, re) {
  let total = 0;
  for (const match of text.matchAll(re)) total += Number(match[1]);
  return total;
}

// The workspace a failure line came from: `pnpm -r` prefixes each line with
// `<dir> <script>:`. The highest one that has a line matching `marker`; 0 when
// no line carries a known prefix.
function workspaceStep(text, marker) {
  const flags = marker.flags.replace("g", "");
  const line = new RegExp(marker.source, flags);
  let step = 0;
  for (const row of text.split("\n")) {
    const prefix = /^((?:packages|apps)\/[\w-]+) [\w:-]+:/.exec(row);
    if (prefix && line.test(row)) step = Math.max(step, WORKSPACES[prefix[1]] ?? 0);
  }
  return step;
}

// Reads the output of a failed gate: the stage it stopped at and the number
// of failures in it. Returns null when the output has no known marker.
export function parseFailure(raw) {
  const text = raw.replace(ANSI, "");
  const nodeFailed = sum(text, /^# fail (\d+)\s*$/gm) + sum(text, /^ℹ fail (\d+)\s*$/gm);
  const testsRe = /Tests:?\s+(\d+) failed/g;
  const suitesRe = /Test Suites:?\s+(\d+) failed|Test Files\s+(\d+) failed/g;
  const tests = sum(text, testsRe);
  const suites =
    sum(text, /Test Suites:?\s+(\d+) failed/g) + sum(text, /Test Files\s+(\d+) failed/g);
  // INFO: node --test runs after every workspace, so when it fails the
  // workspaces passed and its count is the one of the step reached.
  if (nodeFailed > 0) return { stage: "test", step: NODE_STEP, failures: nodeFailed };
  if (tests > 0) return { stage: "test", step: workspaceStep(text, testsRe), failures: tests };
  if (suites > 0) return { stage: "test", step: workspaceStep(text, suitesRe), failures: suites };
  const types = (text.match(/error TS\d+/g) ?? []).length;
  if (types > 0)
    return { stage: "typecheck", step: workspaceStep(text, /error TS\d+/), failures: types };
  const eslint = sum(text, /✖ (\d+) problems?/g);
  const prettier = [
    ...text.matchAll(/Code style issues found (?:in (?:the above )?(\d+ )?files?)?/g),
  ].reduce((total, match) => total + (match[1] ? Number(match[1]) : 1), 0);
  if (eslint + prettier > 0)
    return { stage: "lint", step: eslint > 0 ? 1 : 2, failures: eslint + prettier };
  return null;
}

// PostToolUse (pass) and PostToolUseFailure (fail) of the gate.
export function record(input, projectDir) {
  if (input?.agent_type !== AGENT) return;
  if (input.tool_name !== undefined && input.tool_name !== "Bash") return;
  const command = input.tool_input?.command;
  if (typeof command !== "string" || classify(command).kind !== "gate") return;

  const file = recordFile(input, projectDir);
  if (input.hook_event_name === "PostToolUse") {
    rmSync(file, { force: true });
    return;
  }
  const current = readRecord(file);
  if (current.count < 1) return;
  const result = parseFailure(collectText([input.tool_response, input.error]).join("\n"));
  const results = current.results.slice(0, current.count - 1);
  results[current.count - 1] = result;
  writeRecord(file, { count: current.count, results });
}

// SubagentStop: the agent is done, its records are not needed any more.
export function stop(input, projectDir) {
  if (input?.agent_type !== undefined && input.agent_type !== AGENT) return;
  rmSync(recordFile(input, projectDir), { force: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readFileSync(0, "utf8");
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const input = JSON.parse(raw);
  if (input.hook_event_name === "SubagentStop") {
    stop(input, projectDir);
  } else if (
    input.hook_event_name === "PostToolUse" ||
    input.hook_event_name === "PostToolUseFailure"
  ) {
    record(input, projectDir);
  } else {
    const output = decide(input, projectDir);
    if (output) process.stdout.write(JSON.stringify(output));
  }
}
