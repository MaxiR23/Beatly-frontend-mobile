# 009. i18n in es and en, mandatory from the first screen

Why every visible string ships in Spanish and English, in the same
change, from the first screen, and how a `reason` from the API reaches
the user.

## Context

The legacy app had i18n with namespaces per screen in both languages,
and used it in 41 of 140 component files. The rest hardcoded Spanish or
English inline, and the queue provider called the translation hook
without a namespace. Retrofitting was tracked as an issue for months
and never done: a string added inline stays inline.

The new contract returns `reason` as a stable identifier, explicitly
not a text to display.

## Decision

- Every visible string, including placeholders, accessibility labels,
  toasts, alert titles and default props, goes through i18n. Nothing
  is written inline "for now".
- Languages: `es` and `en`. A key is added to both in the same change;
  a repo-wide test fails when the two namespaces differ.
- One namespace per screen under `apps/mobile/src/i18n/`, plus a
  `common` namespace for the states every screen draws (loading, empty,
  error, retry) and the shared components' text.
- Components in `packages/ui` do not translate. They receive text as
  props; the screen translates. That keeps `ui` free of the i18n
  library and of the app's namespaces.
- Every `reason` a screen branches on maps to a key. A `reason` with no
  mapping falls to the generic error state. No `reason` string is ever
  rendered.
- The device language chooses `es` or `en`; anything else falls back to
  `en`. There is no in-app language switch in V1.

## Consequences

- A screen's definition of done includes its keys in both languages
  (`CLAUDE.md`), and review flags a string outside i18n as Blocking.
- Pluralization and interpolation use the i18n library's own
  mechanisms, never string concatenation.
- Adding a third language is a namespace directory and a parity test
  entry, not a code change.

Why the alternatives were rejected:

- One language first, the other "when stable": the second never comes,
  and the strings written meanwhile are the retrofit that failed once.
- Translating inside `ui` components: couples the design system to the
  app's namespaces and makes a component untestable without the i18n
  runtime.
- Showing `reason` as text with a fallback: a snake_case identifier on
  screen is a bug the contract explicitly warns about.
