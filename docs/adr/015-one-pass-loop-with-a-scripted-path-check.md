# 015. One-pass loop with a scripted path check

Why the loop picks its path with a script instead of three conditions,
runs the gate and the review once, plans and refines only when the
issue needs it, and freezes the scope at the start.

## Context

An audit of two session transcripts measured the loop as it stood after
`014-ship-through-a-script-and-a-skill.md`. A docs-only change of four
markdown files took 71 minutes and fourteen agent runs; a bootstrap of
one blank route took 79 minutes. The cost was not the model choice but
repetition: the gate ran 18 and 19 times per issue, `refine-issue`
restated issues that already had scope and acceptance criteria, and
`plan-issue` wrote a 40 KB plan for a blank route. The review ran three
passes on the docs change, each followed by a fix run and a fresh
prepare, for findings the gate would have caught. The orchestrator, on
the most expensive model, read every agent definition before
dispatching and re-read the diff after every hand-back, and did
implementation work itself. Half of the docs change was rework from
scope the owner added mid-loop. The short path of
`013-short-path-for-docs-only-changes.md` existed but was not taken,
because its three conditions were checked by judgment against the
issue, not by a tool against the diff.

## Decision

- `scripts/loop-path.sh` decides the path from the changed files and
  prints `short` or `full`. Short only when every changed file is a
  `.md` and none is `CLAUDE.md` or under `.claude/` or `.github/`.
  It runs after `implement-issue`; short goes to `ship`, full goes to
  `review-changes`. This supersedes the three conditions of 013 and
  the "when in doubt" clause: there is nothing to doubt.
- `implement-issue` runs the gate once, when the plan is implemented.
  If it fails, it fixes and reruns, at most three attempts, then stops
  and reports. It reads the plan, not the sources the plan already
  cites, and hands back with the diff stat.
- `plan-issue` runs only when the issue touches `packages/core` or a
  screen. Any other issue goes from its body to `implement-issue`.
- `review-changes` runs once, over the diff against `origin/main`
  (`git diff origin/main...HEAD` plus what is still uncommitted, since
  the change is committed by `scripts/ship.sh` after the review), not
  over whole files. A finding needs a concrete failure scenario or a written rule it
  breaks; what the gate catches is not reported; code that follows a
  documented convention is never a finding; zero findings is valid.
- `verify-findings` stays as it was and runs only when the review has
  a Blocking or Important finding. Minor findings get one fix cycle
  and no re-review; what stays open is listed in the pull request.
- `refine-issue` becomes a skill, used only when the issue lacks scope,
  out of scope or acceptance criteria. It drafts the missing sections
  and edits the issue only after the owner approves them. A new
  `create-issue` skill drafts an issue from the template, with one type
  label and a title that passes commitlint, and creates it only after
  approval.
- The orchestrator is an Opus 5.5 session. It dispatches each stage by
  name with a one-line prompt, does not read the agent definitions and
  does not implement.
- The scope is the issue body when the loop starts. What comes up
  mid-loop is a new issue.
- `.claude/settings.json` is versioned and holds the loop's
  permissions: the gate commands, the two scripts and `gh issue view`
  allowed; any direct `git push`, `gh pr merge` and reading `.env`
  denied. Denying every direct push, rather than only the force push
  and the push to `main` the issue names, is what the rule syntax
  allows: rules match command prefixes, so `git push --force` can be
  denied but `git push origin branch --force` cannot, while
  `scripts/ship.sh` is the only pusher anyway. `scripts/ship.sh`
  stages that one file under `.claude/` and refuses the rest, where
  014 refused all of it.

## Consequences

- A docs-only change runs `implement-issue`, the gate inside it, the
  path script and `ship`: one agent run and two scripts.
- The two approvals of the owner stay where they were: the plan, when
  there is one, and the pull request body. The gate still runs before
  every commit and every push, inside `scripts/ship.sh`.
- A change to `CLAUDE.md`, `.claude/` or `.github/` always takes the
  full loop, however small: those files are the rules the loop runs on.
  A `.md` change anywhere else is never reviewed by an agent, so the
  grep for secrets and the external provider's name on that path is
  still run by hand before prepare, as 014 says.
- The reviewer's bar is higher: a deviation without a failure scenario
  or a written rule is not a finding. The rules of `CLAUDE.md` and the
  ADRs are the written rules; a convention that is not written down
  cannot produce a finding, which is one more reason to write it down.
- `.claude/agents/` holds four agents and `.claude/skills/` three
  skills; `docs/repository-setup.md` lists them.
- The deny list is a layer, not the guard. It stops the agent's own
  tool calls; the branch ruleset in `docs/repository-setup.md` is what
  protects `main` on the server, and a push from inside
  `scripts/ship.sh` is not matched by the rules at all.

Why the alternatives were rejected:

- Deleting `verify-findings` and letting the reviewer verify its own
  findings, as the audit proposed: it is the only independent check
  between a reviewer's claim and a fix cycle, and it costs nothing when
  the review has no Blocking or Important finding, which is when it
  does not run. Nothing that makes the loop safer is removed.
- Keeping the three conditions and asking the orchestrator to check
  them: that is what did not happen. A script over the diff cannot be
  talked into the full loop by a goal that says "full loop".
- Refining every issue: both audited issues arrived with their
  sections written, and the refinement was a reformatted copy that
  every later stage re-read. An issue that lacks a section is the case
  the skill is for.
- Planning every issue: a plan earns its cost when there are routes,
  schemas and service cases to verify against the contract. A docs or
  tooling issue has none.
