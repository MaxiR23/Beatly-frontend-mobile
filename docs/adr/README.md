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

- `011-no-secrets-in-code-and-provider-never-named.md` says that
  `review-changes` greps every diff for `https://` literals and for the
  provider's name and hostnames. Since
  `013-short-path-for-docs-only-changes.md`, a docs-only change can
  reach a pull request without `review-changes` running. On that path
  the grep is run by hand before `scripts/ship.sh prepare`: the script
  does not read the diff, and `014-ship-through-a-script-and-a-skill.md`
  says why.
- `013-short-path-for-docs-only-changes.md` names a shipping agent as
  the last step of the loop, checking the three conditions against the
  diff and running the provider grep on the short path. Since
  `014-ship-through-a-script-and-a-skill.md` the loop ends with the
  `ship` skill over `scripts/ship.sh`, neither of which reads the diff:
  the conditions are checked by whoever picks the path, and the grep is
  run by hand before prepare.
- `013-short-path-for-docs-only-changes.md` admits the short path on
  three conditions, one of them "configuration that does not affect the
  build", and routes it as `implement-issue -> gate -> ship-issue`.
  Since `015-one-pass-loop-with-a-scripted-path-check.md` the path is
  one mechanical rule, printed by `scripts/loop-path.sh` from the
  changed files: short only when every file is a `.md` and none is
  `CLAUDE.md` or under `.claude/` or `.github/`. The gate runs inside
  `implement-issue` and inside `scripts/ship.sh`.
- `014-ship-through-a-script-and-a-skill.md` says that
  `scripts/ship.sh` refuses every path under `.claude/` and that
  `.claude/agents/` holds five agents. Since
  `015-one-pass-loop-with-a-scripted-path-check.md`,
  `.claude/settings.json` is versioned and the script stages it;
  `.claude/agents/` holds four agents, `refine-issue` having become a
  skill next to `create-issue` and `ship`.
- `012-squash-only-merges-on-main.md` says that lowering the commitlint
  header length limit to leave room for the " (#N)" GitHub appends is a
  follow-up. It is done: `header-max-length` in commitlint.config.js is
  64, so a title at the limit plus the suffix fits in 72 on main.
- `008-design-tokens-and-single-dark-theme.md` says the first `ui` PR
  is `tokens.ts` and the text component, before any screen. The first
  `ui` change (issue #9) added a single token, `color.surface.base`, in
  `packages/ui/src/tokens/color.ts`, so the Expo bootstrap could draw
  its dark root without a literal; the rest of the token set and the
  text component still come before the first real screen.
- `015-one-pass-loop-with-a-scripted-path-check.md` says
  `.claude/settings.json` allows only "the gate commands, the two
  scripts and `gh issue view`" without a prompt. Since issue #15, the
  allow list also has `pnpm format`, `pnpm --filter`, `pnpm exec
commitlint`, read-only git (`fetch`, `diff`, `status`, `log`,
  `ls-files`), `gh issue create`, `gh issue edit`, `gh label list`,
  `gh pr view` and `gh pr list`; the deny list is unchanged.
- `004-expo-audio-behind-the-player-port.md` says "The stream URL the
  port receives comes from the backend, like every other piece of data.
  The client does not resolve audio." Since
  `021-stream-resolution-in-the-client-behind-a-config-port.md`, the
  client resolves the stream URL in `core`, because the external
  provider's stream URLs are bound to the IP that resolves them.
- `011-no-secrets-in-code-and-provider-never-named.md` says the
  environment holds exactly three values and the client talks to the
  Beatly API and Supabase auth and to nothing else. Since
  `021-stream-resolution-in-the-client-behind-a-config-port.md`, the
  environment holds six public values (those three plus the stream
  endpoint, client name and version) and the client also calls the
  external provider's resolution endpoint. No secret and the provider
  never named still stand.
- `004-expo-audio-behind-the-player-port.md` does not say what the
  player's queue is. Since issue #43 the queue is the tracks loaded when
  a row is tapped, handed to the playback controller in `core`: the
  controller does not drive the infinite query, so a long paginated
  playlist (own or liked) stops after its loaded pages. Autoplay or an
  up-next list needs a new record.

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
- `012-squash-only-merges-on-main.md` — why main only takes squash
  merges with linear history, and why each pull request lands as one
  commit named by its title.
- `013-short-path-for-docs-only-changes.md` — why a change that only
  touches documentation can skip refinement, planning, review and
  verification, which three conditions admit it, and why minor review
  findings get one fix cycle.
- `014-ship-through-a-script-and-a-skill.md` — why the last step of the
  loop is a shell script plus a skill instead of an agent, what each
  half owns, and why nothing reads previous pull requests to learn
  their shape.
- `015-one-pass-loop-with-a-scripted-path-check.md` — why the loop
  picks its path with a script instead of three conditions, runs the
  gate and the review once, plans and refines only when the issue needs
  it, and freezes the scope at the start.
- `016-queries-do-not-retry-automatically.md` — why the query client sets
  `retry: false`, so an error reaches the screen within the HTTP
  client's 15 seconds instead of about 67, and the error state's retry
  is the only one.
- `017-native-tabs-and-glass-surfaces.md` — why the tab bar is native on
  iOS 26+ and `FloatingTabBar` elsewhere, and why `GlassSurface` is the
  only importer of `expo-glass-effect`.
- `018-infinite-query-cache-time-and-cursor-restart.md` — why an infinite
  query's stale time is the smallest max-age among its pages, and why the
  shared infinite-query hook drops the pages before a restart from the
  first page.
- `019-dominant-color-behind-an-adapter.md` — why the dominant color of a
  cover comes from `react-native-image-colors` behind an adapter with no
  port, loaded only where its native module exists, and why the surfaces
  stay neutral where it does not.
- `020-shared-detail-routes-per-tab.md` — why the four tabs are groups
  sharing one layout, so a detail screen opens inside the current tab and
  keeps that tab's back stack.
- `021-stream-resolution-in-the-client-behind-a-config-port.md` — why the
  client resolves a track's stream URL itself, behind a `config` port with
  three public values, instead of receiving it from the backend.
