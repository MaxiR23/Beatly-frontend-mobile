# Development workflow

Flow for every feature, fix or non-trivial change in this repo.

1. **Open an issue**
   - Title: `type(scope): short description`
   - Body: scope, out of scope, acceptance criteria
   - Label matching the commit type: feat, fix, docs, chore, test,
     refactor, ci. `scripts/ship.sh` takes the branch type from the
     label and the commit message from the title, so the title needs
     its scope: commitlint rejects one without it.
   - The `create-issue` skill drafts an issue from
     `.github/ISSUE_TEMPLATE/issue.md` with its label and a title that
     passes commitlint, and creates it only after the owner approves the
     draft. The `refine-issue` skill does the same for an existing issue
     that lacks scope, out of scope or acceptance criteria: it drafts
     the missing sections against the code and the API contract and
     edits the issue only after approval. An issue that has the three
     sections is not refined.
   - If the screen needs data the API does not offer, that is a
     backend issue first. The front does not work around a missing
     endpoint.
   - Scope freeze: the scope is the issue body when the loop starts.
     What comes up mid-loop is a new issue, not an addition to the
     running one.

2. **Create the branch**
   - From updated main: `git checkout main && git pull`
   - Naming: `w_YYMMDD_type_short_description`, underscores only
   - Check the date with `date` before naming it
   - Or skip this step and work on main without committing:
     `scripts/ship.sh prepare` creates the branch at step 6 with the
     same naming.

3. **Implement**
   - Through the agent loop, driven by an orchestrator that runs in an Opus 5.5 session
     that dispatches each stage by name with a one-line prompt (issue
     number, plan path, mode), does not read the agent definitions and
     does not implement. See the Workflow section of CLAUDE.md.
   - `plan-issue` runs only when the issue touches `packages/core` or a
     screen, and the owner approves the plan before any code is
     written. Any other issue goes straight to `implement-issue`, whose
     scope and acceptance criteria stand in for the plan.
   - `implement-issue` reads the plan, not the sources the plan already
     cites, and hands back with the diff stat.
   - Tests and implementation ship in the same branch.
   - See the definition of done in CLAUDE.md.

4. **Verify locally**
   - `implement-issue` runs `pnpm gate` (`pnpm typecheck`, `pnpm lint`
     and `pnpm test`, in that order) once, when the plan is
     implemented. If it fails, it fixes and reruns, at most three
     attempts, then stops and reports. `scripts/ship.sh` runs the gate
     again at steps 6 and 7.

5. **Pick the path and review**
   - `scripts/loop-path.sh` prints `short` or `full` from the changed
     files, per the rule under "Short path" below. Short goes to step 6.
     Since nothing reviews that diff, the `ship` skill greps it for
     secrets and the provider's name (and for `https://`) before
     `scripts/ship.sh prepare`; `scripts/ship.sh` itself does not read
     it.
   - Full: run `review-changes` once, over the diff against
     `origin/main` (`git diff origin/main...HEAD` plus what is still
     uncommitted), not over whole files. Then `verify-findings`, only if
     the review reports Blocking or Important findings.
   - `implement-issue` in fix mode fixes what `verify-findings`
     confirmed plus the minors the owner decided to fix, in one cycle,
     and runs the gate. There is no second review: what the fix cycle
     leaves open is listed in the pull request for the owner to decide.

6. **Commit**
   - Through the `ship` skill, once blocking and important findings
     are fixed and the minor ones are decided. The skill names the
     files of the change; `scripts/ship.sh prepare` creates the branch
     if needed, runs the gate, commits those paths and writes
     `.claude/loop/pr-N.meta`. The skill then writes the pull request
     body and stops. The gate runs on the working tree, so a file left
     out of the paths still has to pass it.
   - Conventional commits: `type(scope): short description`, lowercase,
     one line. No body: the reasoning goes in the pull request.
   - These branch commits never reach main; only the squash does.

7. **Push and open the PR**
   - Through the `ship` skill again, after approving the body. The body
     is `.claude/loop/pr-N.body.md` and can be edited before approving:
     what is in the file is what gets published. Then
     `scripts/ship.sh publish` checks that nothing moved since prepare,
     runs the gate, pushes and opens or updates the pull request.
   - Body: `Closes #N` first, then the sections of
     `.github/pull_request_template.md` that apply, in its order. The
     template and the skill's writing rules are the shape: nothing
     reads previous pull requests or commits to learn it.

8. **Merge and later could delete the branch**
   - The merge is a squash, the only method the branch ruleset allows.
   - The pull request lands on `main` as one commit: by default its
     message is the pull request title plus the number GitHub appends.
   - Both required checks, `checks` and `GitGuardian Security Checks`,
     have to be green before the merge is allowed.
   - See `docs/repository-setup.md` for the ruleset configuration.

## Recovery

Four cases, covering steps 4 to 7:

- Three gate failures inside `implement-issue` (step 4): the owner
  decides between a `plan-issue` addendum or `implement-issue` in fix
  mode, with the failing output as its list.
- A gate failure inside `scripts/ship.sh prepare` (step 6), or inside
  `scripts/ship.sh publish` (step 7, which also runs the gate before
  the push): run `implement-issue` in fix mode with the gate output,
  then `prepare` again. Fixing a publish gate failure changes tracked
  files, so `publish` would die with "uncommitted changes in tracked
  files: prepare again" anyway.
- Every other `scripts/ship.sh publish` failure before `git push` (not
  on the branch, HEAD moved since prepare, uncommitted changes in
  tracked files, a PR already exists, the open PR changed): follow the
  script's own message and run `prepare` again. Only a failure after
  the push and before the PR exists — where `prepare` would die with
  "branch is pushed but has no open PR" — is retried with `publish`
  again, never `prepare`.
- An open decision `implement-issue` raises in issue mode or fix mode
  (step 3 or the fix cycle of step 5): the answer goes in the
  invocation text, verbatim.

## Short path

Path: `scripts/loop-path.sh` prints `short` or `full` from the changed
files. Short only when every changed file is a `.md` and none is
`CLAUDE.md` or under `.claude/` or `.github/`. Short skips review and
verification and goes to `ship`; full goes to `review-changes`. There is
no partial path: the script decides, not judgment.

The short path is:

    implement-issue -> scripts/loop-path.sh -> ship

The gate runs inside `implement-issue` and again inside
`scripts/ship.sh`. The short path skips `plan-issue`, `review-changes`
and `verify-findings`; `implement-issue` works from the issue itself:
its scope and acceptance criteria stand in for the plan. The `ship`
skill still prepares the body and publishes only after the owner
approves it.

`.claude/settings.json` is the project's permission set for the loop:
the gate commands (`pnpm gate`, `pnpm typecheck`, `pnpm lint`,
`pnpm test`), `pnpm format`, `pnpm --filter`, `pnpm exec commitlint`,
`scripts/ship.sh`, `scripts/loop-path.sh`, read-only git (`fetch`,
`diff`, `status`, `log`, `ls-files`), `gh issue view`, `gh label list`,
`gh pr view` and `gh pr list` run without a prompt. `gh issue create`
and `gh issue edit` are in the same allow list: each already requires
the owner's approval of the drafted text before the `create-issue` or
`refine-issue` skill runs it, so the prompt would only double that
approval. Any direct `git push` (the script is the only pusher, so a
force push or a push to `main` has no allowed form), `gh pr merge` and
reading `.env` are denied. The rules match command prefixes, so they
are a layer over the branch ruleset in `docs/repository-setup.md`,
which is what protects `main` on the server; they are not the guard.
