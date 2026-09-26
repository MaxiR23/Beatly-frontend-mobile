# docs/adr

Architecture decision records for Beatly mobile. A record explains why
a non-obvious piece of the design is the way it is: the alternatives
considered and why they were rejected. The reasoning that would
otherwise live in a pull request description, which is where nobody
looks for it six months later.

## File name

    NNN-title-in-kebab-case.md

Three-digit number, zero-padded, followed by a hyphen and a
kebab-case title. The next record takes the next free number.

## Sections

Every record has the same three sections, in this order:

    ## Context
    ## Decision
    ## Consequences

## Immutability

A record, once written, is never edited. It is a record of a
decision made at a point in time, not a living document.

## Supersession

A decision that changes is documented as a new record, which
states explicitly which earlier number it supersedes. The earlier
record is left as it was written.

## Corrections

A record is never edited, so a statement in one that has since
become wrong is corrected here, in this README, not in the record
itself. That covers both sources of obsolescence: a later record
that replaced the decision, and the code moving on from what the
record described.

None yet.

## Files

- `001-react-native-with-expo.md` — why the app stays on React Native
  with Expo instead of going native, and why desktop is not designed
  until V2 has shipped.
- `002-pnpm-monorepo-with-platform-free-core.md` — why the repo is
  three pnpm workspaces, why `core` imports nothing from the platform
  and talks through ports, and why adapters live in the app.
- `003-expo-sdk-version-policy.md` — why the app always targets the
  latest stable Expo SDK, at most one behind, upgraded in a PR of its
  own with the React Compiler on.
- `004-expo-audio-behind-the-player-port.md` — why the audio engine is
  `expo-audio` behind a `player` port that no library type crosses, and
  why `react-native-track-player` v5 is the plan B, not the plan A.
- `005-tanstack-query-with-cache-control-times.md` — why server state
  in the UI goes through TanStack Query, why cache times come from the
  backend's `Cache-Control` and never from a literal, and why user data
  is invalidated on mutation.
- `006-zod-at-the-http-edge-as-source-of-types.md` — why every response
  is parsed by a zod schema in `core` and the domain types are inferred
  from it, and what happens to a body that fails.
- `007-supabase-for-auth-only-session-in-secure-store.md` — why the
  client uses Supabase for authentication and nothing else, and why the
  session lives in `expo-secure-store`.
- `008-design-tokens-and-single-dark-theme.md` — why every visual value
  is a token in `packages/ui`, and why there is one dark theme and no
  light mode.
- `009-i18n-es-and-en-mandatory.md` — why every visible string ships
  in Spanish and English from the first screen, and how `reason` values
  reach the user.
- `010-import-boundaries-enforced-by-eslint.md` — why the package
  boundaries are ESLint rules in the gate, and why `no-restricted-*`
  rules were chosen over a boundaries plugin.
- `011-no-secrets-in-code-and-provider-never-named.md` — why the only
  env values are three public ones, and why the external provider is
  never named in code, docs, tests, commits or issues.
