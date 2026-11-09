# 034. The agent's gate runs alone and is limited by progress

## Context

Measured on a clean main, the gate gives the same result, time and jest workers inside
`implement-issue` and in the main session. The attempts lost in #148, #150 and #158 came from the
way the agent called it: edits chained in the same command as the gate (16 of 24 runs; in 4 the edit
failed and the gate ran over unchanged code) and calls with no `timeout`, which passed the default
120 s and moved to the background with no verdict (2 of 24). The fixed limit of three attempts
(ADR 015) also stopped runs that were advancing and let through runs that were not.

## Decision

- `scripts/gate-limit.mjs` denies, without counting an attempt, a gate call from `implement-issue`
  that is not the gate alone (only `cd <repo> &&` before, only `2>&1` after), has no `timeout` of
  at least 600000 or runs in the background. The message says how to run it. The call is denied, not
  rewritten (`updatedInput` was rejected): the agent learns the rule instead of depending on a hook
  that edits its commands. `BASH_DEFAULT_TIMEOUT_MS` is not raised project-wide: it would change
  every other command.
- Progress is the measure of the limit. A PostToolUse and PostToolUseFailure hook reads the gate
  output and records, per `agent_id` under `.claude/loop/`, the stage reached (typecheck, lint,
  test), the step inside it (the failing workspace of `pnpm -r`, eslint before prettier, `node
--test` last) and the failures. Attempts 1 to 3 always run; the fourth to sixth only if the last
  attempt reached a later stage, a later step, or the same step with fewer failures. An output the
  hook cannot read is no progress. The absolute cap is 6.
- The step exists because `pnpm -r` stops at the first failing workspace: fixing one and exposing
  errors in the next is progress, not regression. The `node --test` output is read in its spec form
  (`ℹ fail N`) and in TAP.
- A denial for no progress or the cap is sticky: the record is marked stopped and every later gate
  call of that `agent_id` is denied. Deleting it at the denial would reset the count. The records
  are removed when the gate passes and by a SubagentStop hook when the agent stops.
- The orchestrator does not move to review or ship while the gate is not green.

## Consequences

- An agent that keeps retrying the same failure is stopped by the hook, not by its own discipline.
- Rejected: a higher fixed limit (it does not tell advancing from stuck), rewriting the call, and
  a project-wide timeout.
- The parser depends on the output format of pnpm, jest, vitest, eslint, prettier and `node --test`;
  an unknown format is read as no progress, which stops conservatively.
