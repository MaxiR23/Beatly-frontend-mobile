# 014. Ship through a script and a skill

Why the last step of the loop is a shell script plus a skill instead
of an agent, what each half owns, and why nothing reads previous pull
requests to learn their shape.

## Context

The loop ended with an agent that created the branch, ran the gate,
committed, wrote the pull request draft and, after approval, pushed
and opened the pull request. Most of those steps are mechanical: git
and `gh` commands whose right outcome is fixed. Prose instructions to
a model are a poor fit for them: each run re-derived the same
commands, could stage a file by hand or skip the gate, and read
previous pull requests to copy their shape, so the shape drifted with
every pull request and the template stopped being the source. The two
parts that do need judgment, which files belong to the change and what
the body says, were mixed with the mechanical ones and got the same
scrutiny.

## Decision

- `scripts/ship.sh` does the mechanical half, in two commands.
  `prepare <issue> [path ...]` creates the `w_` branch from the issue's
  type label and title when on `main`, runs the gate, refuses paths
  that never ship (`.claude/`, root env files, native folders) and
  commits the given paths with the issue title as message: before the
  first push a second prepare amends that commit, after it a new
  commit is added, because the script never force-pushes and an open
  pull request keeps its title and history. It then writes
  `.claude/loop/pr-<issue>.meta`. `publish <issue>` checks that the
  branch, the commit and the tracked files have not moved since
  prepare, runs the gate again, rejects a body with template comments
  or attribution, pushes, and creates or edits the pull request from
  `.claude/loop/pr-<issue>.body.md`.
- The `ship` skill in `.claude/skills/ship/` does the judgment half: it
  picks the paths from the plan, the fix list or the issue, calls
  prepare, writes the body from `.github/pull_request_template.md` and
  stops. It calls publish only when the owner has approved the body.
  The approval between the two halves stays.
- `pnpm gate` in the root `package.json` is
  `pnpm typecheck && pnpm lint && pnpm test`. The script runs it once
  per command; the skill never runs it.
- `.github/pull_request_template.md` is a fixed skeleton: `Closes #N`,
  "What it does" and five optional sections, among them "Verified on
  device". The body is filled from the issue, the plan, the review and
  the diff. Nothing reads previous pull requests, commits or branches
  to learn their shape.
- This record supersedes `013-short-path-for-docs-only-changes.md`
  where it assigns the check of the three short-path conditions and
  the grep for the provider's name to the last step of the loop.
  Neither the script nor the skill reads the diff: the conditions are
  checked by whoever picks the path, and on that path the grep is run
  by hand before prepare.

## Consequences

- The gate runs on the working tree in both commands, not on the
  commit: a file left out of the paths still has to pass it, and CI
  is what checks the pushed commit on its own.
- Shipping is reproducible: the same paths give the same branch,
  commit and pull request, and a wrong state (a rebase in progress, a
  branch behind `origin/main`, a pushed branch without a pull request,
  a `HEAD` that moved since prepare) stops the script with one line
  instead of being worked around.
- The issue must carry exactly one type label and a title with a
  scope: the script takes the branch type from the label and the
  commit message from the title, and commitlint rejects a header
  without scope.
- The last step of the loop is no longer an agent, so `.claude/agents/`
  holds five agents and `.claude/skills/` joins the per-clone exclude
  list in `docs/repository-setup.md`.
- The short path has no automated provider grep before the pull
  request. `GitGuardian Security Checks` still runs in CI on every
  path, and the owner reads the body before publish.

Why the alternatives were rejected:

- Keeping the agent with a tighter prompt: a prompt cannot make a
  model refuse to `git add .` or skip the gate; a script refuses by
  construction.
- Putting everything in the script: which files belong to the change
  and what the body says depend on the plan, the review and the diff;
  a script would fill the template with placeholders.
- A GitHub Action that opens the pull request on push: it moves the
  approval after the push, and the body would be written where the
  owner cannot edit it before it is public.
