# 013. Short path for docs-only changes

Why a change that only touches documentation can skip refinement,
planning, review and verification, which three conditions admit it,
and why minor review findings get one fix cycle.

## Context

The agent loop ran every change through `refine-issue`, `plan-issue`,
`implement-issue`, `review-changes` and `verify-findings` before
`ship-issue`. Those steps verify a change against the code and the API
contract: routes, schemas, states, tokens, i18n keys and tests. A
change that only rewrites documentation has none of that surface, so
each step ran and found nothing, at the cost of a full pass. Minor
review findings had no bound either: one could go back and forth
between `implement-issue` and review indefinitely before a pull request
was opened.

## Decision

- A change can take a short path when all three conditions hold: it
  touches only `.md` files or configuration that does not affect the
  build; it does not touch `CLAUDE.md` or `.claude/agents/`; it does
  not touch code, dependencies, CI or tokens. The short path is
  `implement-issue -> gate -> ship-issue`.
- A change that fails any condition, or is in doubt, goes through the
  full loop. There is no partial path.
- In the short path, the issue's scope and acceptance criteria stand in
  for the plan, and `ship-issue` checks the three conditions against
  the diff before preparing the draft.
- Minor review findings get at most one fix cycle. What is still open
  after it is listed in the pull request.

## Consequences

- A wording fix reaches a pull request with one implementation pass,
  the gate and a draft, instead of the full loop.
- `CLAUDE.md` and `.claude/agents/` are excluded on purpose: they are
  the rules the loop runs on, so a change to them takes the full loop,
  as the change that introduced this record did.
- A short-path diff is not read by `review-changes`, so the grep for
  the external provider's name and hostnames and for `https://`
  literals that `011-no-secrets-in-code-and-provider-never-named.md`
  assigns to it falls to `ship-issue` on that path. The
  `GitGuardian Security Checks` required check runs in CI regardless of
  the path.
- The rule is written twice, in the Workflow section of `CLAUDE.md`
  and in `docs/workflow.md`, byte-identical, so a drift between the two
  shows in a diff.

Why the alternatives were rejected:

- One path for everything: four steps that cannot find anything in a
  docs-only diff still cost a full pass on every wording fix.
- A lighter review instead of none: what `review-changes` checks in a
  docs-only diff, that the text matches the repo and that no provider
  name appears, is what the person approving the draft reads anyway,
  and `ship-issue` keeps the grep.
- Deciding case by case: a rule that needs judgment on every change is
  not shorter. Three mechanical conditions give the answer, and "when
  in doubt, the full loop runs" resolves the rest toward the full loop.
