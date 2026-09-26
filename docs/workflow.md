# Development workflow

Flow for every feature, fix or non-trivial change in this repo.

1. **Open an issue**
   - Title: `type(scope): short description`
   - Body: scope, out of scope, acceptance criteria
   - Label matching the commit type: feat, fix, docs, chore, test,
     refactor, ci
   - If the screen needs data the API does not offer, that is a
     backend issue first. The front does not work around a missing
     endpoint.

2. **Create the branch**
   - From updated main: `git checkout main && git pull`
   - Naming: `w_YYMMDD_type_short_description`, underscores only
   - Check the date with `date` before naming it
   - Or skip this step and work on main without committing: ship-issue
     creates the branch at step 7 with the same naming.

3. **Write a task spec, only when the issue is not enough**
   - File: `docs/tasks/NNN_short_description.md`
   - Only for work with multiple phases, decisions worth recording, or
     open questions. Most tasks skip this step.

4. **Implement**
   - Through the agent loop: refine-issue, plan-issue, approve the plan,
     implement-issue. See the Workflow section of CLAUDE.md.
   - A change that meets all three conditions under "Short path",
     below, can take that path: implement-issue here, then steps 5,
     7, 8 and 9, skipping step 6.
   - Answer any blocking questions the refinement raises before planning.
     The plan will refuse to start otherwise.
   - Tests and implementation ship in the same branch.
   - See the definition of done in CLAUDE.md.

5. **Verify locally**
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`

6. **Review before committing**
   - Run review-changes, then verify-findings if it reports blocking or
     important findings.
   - Fix what verify-findings confirms, then run the gate again.
   - Minor review findings get at most one fix cycle; any minor still
     open after that is listed in the pull request for the owner to
     decide.

7. **Commit**
   - Through ship-issue, once blocking and important findings are fixed
     and the minor ones are decided. It creates the branch if needed,
     commits, writes the pull request draft and stops.
   - Conventional commits: `type(scope): short description`, lowercase,
     one line. No body: the reasoning goes in the pull request.
   - These branch commits never reach main; only the squash does.

8. **Push and open the PR**
   - Through ship-issue again, after approving its draft. The draft is
     `.claude/loop/pr-N.md` and can be edited before approving: what is
     in the file is what gets published.
   - Body: `Closes #N` first, then what it does, scope, decisions taken
     and what is left to check by hand on a device, shaped like the
     previous pull requests.

9. **Merge and later could delete the branch**
   - The merge is a squash, the only method the branch ruleset allows.
   - The pull request lands on `main` as one commit: by default its
     message is the pull request title plus the number GitHub appends.
   - Both required checks, `checks` and `GitGuardian Security Checks`,
     have to be green before the merge is allowed.
   - See `docs/repository-setup.md` for the ruleset configuration.

## Short path

Docs-only changes can take a short path instead of the full loop. It
applies only when all three conditions hold:

1. The change touches only `.md` files or configuration that does not
   affect the build.
2. It does not touch `CLAUDE.md` or `.claude/agents/`.
3. It does not touch code, dependencies, CI or tokens.

The short path is:

    implement-issue -> gate -> ship-issue

The gate is `pnpm typecheck && pnpm lint && pnpm test`. The short path
skips `refine-issue`, `plan-issue`, `review-changes` and
`verify-findings`. `implement-issue` works from the issue itself: its
scope and acceptance criteria stand in for the plan. `ship-issue` still
prepares the draft and publishes only after the owner approves it.

A change that fails any of the three conditions goes through the full
loop; there is no partial path. When in doubt, the full loop runs.
