# 008. Design tokens and a single dark theme

Why every visual value lives in `packages/ui` tokens, and why there is
one dark theme and no light mode.

## Context

The legacy audit counted 149 distinct hex colors, of which 45 were
interface colors: 18 grays for about five surface roles, 16 grays for
three levels of secondary text, five reds for "error", four greens for
"success". Fifteen fixed font sizes, twenty radii, five ways to write
"pill", two spacing scales side by side, three animation engines. The
same track subtitle had five colors depending on the screen. The only
file called a theme was Expo's template, imported by nobody. The app
was dark only; no screen had a light branch.

## Decision

- `packages/ui/src/tokens/` is the single source of every visual
  value: color (surface levels, text levels, the white accent, semantic
  error and success, borders and overlays), spacing (multiples of
  four), radius (a short scale plus `full`), typography (roles, not
  sizes: title, section, rowTitle, meta, label), motion (a handful of
  durations and one spring) and icon sizes.
- A component in `packages/ui` consumes tokens by name. A screen in
  `apps/mobile` consumes components. Neither writes a literal color,
  size, spacing, radius or font value. The rule is reviewed as
  Blocking; ESLint cannot see a hex string's intent.
- Decorative palettes that are product content (genre gradients, the
  avatar gradients) are tokens too, migrated from the legacy as they
  are, with their names.
- One theme, dark. No `ThemeProvider` switch, no light branch, no
  `useColorScheme`. Tokens are a plain object, importable anywhere in
  `ui` and `apps/mobile` without a context.
- Text is a `ui` component with a role prop and a capped accessibility
  scale; raw `Text` from React Native is not used outside `ui`.

## Consequences

- The first `ui` PR is `tokens.ts` and the text component, before any
  screen. The legacy inventory (`design-tokens-legacy.md` in the old
  repo) is the checklist of roles to name.
- A new visual need is a token PR with the count that shows no existing
  token covers the role (`plan-issue`'s convention rule).
- A light theme, if ever wanted, is a second token object and a context
  around it; nothing in components changes. That is why tokens are
  named by role and not by value.

Why the alternatives were rejected:

- Light and dark from the start: doubling a system nobody asked for,
  with every screen tested twice, for an app that has been dark since
  its first release.
- A styling library with its own theme model: another dependency and
  another mental model between the token and the component. Revisited
  if a second surface (desktop) needs it.
- Per-component constants "close to where they are used": that is the
  legacy, and it produced five colors for one subtitle.
