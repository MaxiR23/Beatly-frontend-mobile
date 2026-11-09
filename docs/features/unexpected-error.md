# Unexpected error

The screen a route draws when rendering it throws.

## Purpose

An error thrown while a screen draws must not leave the user on a red box or a blank window. The route's `ErrorBoundary` export draws this screen, logs the error and gives one way out: back to home.

## Layout

On `color.surface.base`, padded `layout.gutter`, centered, `spacing.xl` between the blocks: the Beatly logo (`BeatlyLogo`), the brand in `typography.brand`, the title in `typography.title`, the apology in `typography.body` and `color.text.secondary`, and a primary `Button`.

## Platform differences

None.

## States

The screen reads no data.

| State            | What is drawn                                                              | i18n keys                                                                                     |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Loading          | n/a                                                                        |                                                                                               |
| With data        | the logo, the brand, the title, the apology and Back to home               | `common:brand`, `common:unexpected.title`, `common:unexpected.body`, `common:unexpected.home` |
| Expected empty   | n/a                                                                        |                                                                                               |
| Error with retry | n/a: Back to home goes to `/` and clears the error (`replace`, then retry) |                                                                                               |

## Data

None. The error is logged with the `log` port as `unexpected_error` with its name and message; it is never shown.

## Navigation

Every route of the root stack exports it as `ErrorBoundary` (the tabs layout, the player, login, sign up, onboarding, session pending, the email callback and not found). The root layout does not: from there it would replace the providers (no core, no log port), and its retry would remount the root and build a second player. A source guard (`scripts/test/error-states.test.mjs`) checks the eight exports. The boundary does not catch errors in event handlers or async code, nor in the providers.

## i18n namespace

`common`.

## Checked by hand

A real crash in a production-mode bundle (`expo start --no-dev`), since in development the red box overlays the boundary.
