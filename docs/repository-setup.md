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
- Require status checks to pass
  - Required check: `checks` (the job in .github/workflows/ci.yml)
  - Require branches to be up to date before merging
- Block force pushes
- Restrict deletions

Effect: main cannot be pushed to directly, cannot be merged into with
CI red, cannot be force-pushed or deleted. The bypass list is empty on
purpose, so the rule applies to the repo owner too.

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
- lefthook: https://lefthook.dev/
- pnpm workspaces: https://pnpm.io/workspaces
