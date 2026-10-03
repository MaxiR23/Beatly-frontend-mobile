# 024. Import cycles fail lint with import-x

Why an import cycle fails `pnpm lint`, with a plugin, and amends ADR 010.

## Context

ADR 010 writes the boundaries with ESLint's own `no-restricted-*` rules and
rejects a plugin as another dependency and a second rule language. It did not
check cycles, because ESLint core cannot: a rule has to resolve imports and
walk the module graph. A real cycle then passed the gate: `TrackMenuHost`
imported `TrackMenuSheet`, which imported the host back for its context. The
legacy app had cycles too (ADR 002, ADR 010).

## Decision

- `eslint-plugin-import-x` and `eslint-import-resolver-typescript` are root
  dev dependencies, pinned. Only `import-x/no-cycle` is enabled, as an error,
  on `.ts` and `.tsx` in every workspace, tests included. Nothing else from
  the plugin is used.
- The TypeScript resolver resolves the `.ts` and `.tsx` extension imports the
  repo requires (ADR 010).
- `import-x/extensions` is `[".ts", ".tsx"]`. The plugin reads only files with
  a listed extension, and its default list leaves these out: without the
  setting the rule runs and never reports.
- The plugin skips imports without specifiers, so a cycle closed by
  `import "./x.tsx"` is invisible to it. A relative side-effect import is
  banned with a `no-restricted-syntax` selector, which closes that gap.
- `unrs-resolver`, a dependency of the resolver, has its build script disabled
  in `pnpm-workspace.yaml`: the prebuilt binding arrives through its optional
  dependencies.

## Consequences

- A cycle through a named, default or namespace import fails the gate locally
  and in CI. Type-only imports are not cycles at runtime and are skipped by
  the plugin.
- Shared context, hooks and types of two files that need each other move to a
  third file.
- ADR 010's "revisited if the rules outgrow `no-restricted-imports`" is met
  for this one rule only; the boundaries stay written with the core rules.

Why the alternatives were rejected:

- A standalone cycle check (`madge`, `dependency-cruiser`): a second tool
  with its own config outside the gate's `pnpm lint`.
- Review alone: the cycle already passed review's reading and the gate.
