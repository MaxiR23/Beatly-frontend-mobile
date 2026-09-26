# 012. Squash-only merges on main

Why main only takes squash merges with linear history required, and
why each pull request lands as one commit whose message is the pull
request title.

## Context

Main is protected, and every change lands through a pull request. A
merge commit adds a "Merge pull request" message that is not a
conventional commit, and it branches the history. The commits made on
a branch while the change is being built are working steps, not the
record of the change.

## Decision

- Squash is the only allowed merge method on main, with linear history
  required.
- Each pull request lands on main as one commit, whose message is the
  pull request title.

## Consequences

- Main reads as one conventional commit per pull request, and a
  changelog can be generated straight from that history.
- The commits made on a branch stay visible only in the pull request,
  not on main.
- GitHub appends " (#N)" to the squash commit title, so pull request
  titles need margin under the commitlint header length limit;
  lowering that limit to leave room is a follow-up.

Why the alternatives were rejected:

- Merge commits: add a "Merge pull request" message that is not a
  conventional commit, and branch the history.
- Rebase merging: keeps every working commit from the branch on main,
  instead of the one commit the pull request represents.
