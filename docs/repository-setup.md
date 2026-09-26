# Repository setup

Configuration that lives in GitHub or in the local clone, not in this
repository. Recreate this manually if the repo is ever rebuilt.

## Branch ruleset: main protection

Settings > Rules > Rulesets

- Enforcement: Active
- Target: default branch (main)
- Bypass list: empty

Rules enabled:

- Require a pull request before merging
  - Required approvals: 0 (the owner is the only contributor)
  - Allowed merge methods: squash only (no merge commit, no rebase)
- Require status checks to pass
  - Required check: `checks` (the job in .github/workflows/ci.yml)
  - Required check: `GitGuardian Security Checks` (reported by the
    GitGuardian app, not by any workflow in this repository)
  - Require branches to be up to date before merging
- Require linear history
- Block force pushes
- Restrict deletions

`GitGuardian Security Checks` has no source in .github/workflows/. If
the GitGuardian app is ever removed from the repository, remove its
check from this ruleset in the same change; otherwise the ruleset waits
for a check that never reports and every merge is blocked.

Effect: main cannot be pushed to directly, cannot be merged into with
either required check red, cannot be force-pushed or deleted, and only
takes squash merges. Linear history holds for every merge after pull
request #2; main still keeps that pull request's merge commit, made
before the ruleset required squash merges and linear history. The bypass
list is empty on purpose, so the rule applies to the repo owner too.

## Pull request settings

Settings > General > Pull Requests

- Allow merge commits: off
- Allow squash merging: on
  - Default commit message: Pull request title
- Allow rebase merging: off

Squash merging is the only merge method enabled, matching the ruleset.
By default GitHub fills the squash commit with the pull request title
followed by ` (#N)` and a blank body; the person merging can still edit
it in the merge dialog. No hook checks that final message: commitlint
runs only in the local `commit-msg` hook, on the branch's own commits,
and never sees what GitHub writes to main. So the pull request title is
what carries the conventional commit format, and it has to leave room
for the ` (#N)` suffix within the 72 characters of `header-max-length`
in commitlint.config.js.

## After cloning

Use the Node version pinned in `.nvmrc`, then install:

    nvm use
    pnpm install

`pnpm install` installs the git hooks through lefthook. If they are
missing, install them by hand:

    pnpm lefthook install

Hooks (`lefthook.yml`): pre-commit runs eslint and prettier on the
staged files, commit-msg runs commitlint, pre-push runs
`pnpm typecheck` and `pnpm test`.

Copy the env file and fill in the public values:

    cp .env.example .env

It holds only the API base URL and the Supabase URL and anon key.
There are no secrets in a client; if a value looks like one, it does
not belong here.

## Agent loop files

`.claude/agents/` and `.claude/loop/` are kept out of version control
per clone, through `.git/info/exclude`, not `.gitignore`:

    .claude/agents/
    .claude/loop/

Add those two lines after cloning. The agents are the repo owner's
tooling and the loop directory is scratch output; neither belongs in
the history or in a pull request.

## CI

`checks` runs `pnpm install --frozen-lockfile`, `pnpm typecheck`,
`pnpm lint` and `pnpm test`. It needs no secrets. Build workflows and
the secrets they need are documented in this file when they exist.

## Requirements

Rulesets on private repositories require GitHub Pro or higher. On the
Free plan they are only available for public repositories.

## SEE

- Managing rulesets for a repository:
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets
- Available rules for rulesets:
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- Configuring pull request merges:
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges
- lefthook: https://lefthook.dev/
- pnpm workspaces: https://pnpm.io/workspaces
