# Auth: login, sign up and session

The first feature doc: the routes the auth screens use and the states they draw.

## Screens and routes

| Route              | Screen                               | Guard                                                                                    |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `/login`           | `LoginScreen`                        | signed out only (`Stack.Protected` on `status === "signed_out"`; signed in lands on `/`) |
| `/sign-up`         | `SignUpScreen`                       | signed out only                                                                          |
| `/auth/callback`   | `AuthCallbackScreen`                 | none: reachable in `unknown`, `signed_out` and `signed_in`                               |
| `/session-pending` | `SessionPendingScreen`               | `unknown` only: the app background under the splash while the stored session is read     |
| `/`                | `HomeScreen` (first tab of `(tabs)`) | signed in only; see `home.md`                                                            |

While the status is `unknown`, only `session-pending` and `auth/callback` are available and the
native splash stays up. `session-pending` is the one shown; `auth/callback` mounts only when an
email link opens it. On `signed_out`, `login` and `sign-up` mount. On `signed_in`, `(tabs)`
and `player` mount. The splash hides once the status is known and the root route has left
`session-pending`, after the commit that mounts the screen it lands on.

A route whose guard fails renders a redirect to the screen the status allows (`redirectTo` on
each `Stack.Protected`: `/session-pending` while `unknown`, `/login` signed out, `/` signed in).
Without it the router falls back to the first unguarded route in file order, which is
`auth/callback`, and a cold start would stay on the callback's invalid-link state.

## Layout

Login and sign up share `apps/mobile/src/screens/auth/AuthLayout.tsx`: the brand
block (the legacy brand icon at `apps/mobile/assets/brand-icon.png`,
`common:brand` and the per-screen `subtitle`), the `Card` with the title, the
description, the form and the switch line, and `common:footer`. Password fields
have an eye button (`common:password.show` / `common:password.hide`).

The switch line draws two keys side by side, `{switchText} <Link label={switchLabel} />`,
with the link always last. It is two sentences, not interpolation, so ADR 009 is
not broken. It holds for es and en, as in legacy, and the repo has no rich-text
i18n helper. A language that needs the link first would need one.

## API

`GET /profile/me`: not paginated, `Cache-Control: private, no-cache` (always stale).
It now feeds the home avatar; see `home.md`.

The core schema declares `username` as nullable, as the backend does: it is null
until the user sets one, so `GET /profile/me` succeeds for a freshly signed-up
account. The name shown is `username`, or `display_name` when `username` is null, in the header avatar; the account row and the profile screen show `display_name`.

## Auth port operations

`signIn`, `signUp`, `signOut`, `confirmEmail`, `getStatus`, `getEmail` and `onAuthChange`.
None of the sign operations rejects: every failure, including a 15 second
timeout, is a typed `AuthFailure`.

| Port reason           | Screen   | i18n key                          |
| --------------------- | -------- | --------------------------------- |
| `invalid_credentials` | login    | `login:errors.invalidCredentials` |
| `email_not_confirmed` | login    | `login:errors.emailNotConfirmed`  |
| `rate_limited`        | login    | `login:errors.rateLimited`        |
| `rate_limited`        | sign up  | `signUp:errors.rateLimited`       |
| `weak_password`       | sign up  | `signUp:errors.weakPassword`      |
| `user_already_exists` | sign up  | `signUp:errors.userAlreadyExists` |
| `invalid_email`       | sign up  | `signUp:errors.invalidEmail`      |
| `link_invalid`        | callback | `authCallback:invalidLink`        |
| `unknown` and others  | all      | `common:error.generic`            |

## States per screen

| Screen   | Loading                        | With data                                       | Expected empty                                | Error with retry                                                                             |
| -------- | ------------------------------ | ----------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Login    | submit button `loading`        | the form                                        | n/a (form)                                    | the mapped message above the submit; the submit is the retry                                 |
| Sign up  | submit button `loading`        | the form with the password rule, green when met | n/a (form)                                    | the mapped message; success is the "check your email" empty state                            |
| Callback | `LoadingState` while verifying | redirect to `/`                                 | missing or malformed link draws `invalidLink` | `link_invalid`: `invalidLink` with "back to log in"; anything else: generic error with retry |

## Session

- `getStatus` reads the stored session from the secure store without the network,
  so the gate decides at once.
- `getEmail` reads the email of the stored session from the secure store without the network (never the library's session read, which refreshes an expired session); the profile screen draws it.
- Change events from `onAuthChange` flip the gate; a `signed_in` to `signed_out`
  change clears the query cache.
- Token refresh follows the app's foreground state (`AppState`).
- A request fails within 15 seconds: the HTTP client budget covers the token read
  and the send, sign operations are wrapped in the same budget, and queries do not
  retry automatically.
- Known edge: with an expired session, a dead network and an unreadable store at
  the same time, the splash can stay up over the placeholder, not over the login. It is logged as `session.status_unreadable`.
- Known edge: a cold start on /sign-up while signed out lands on the login, not on sign up. While the status is unknown only session-pending and auth/callback exist, so on signed_out the stack falls back to its first route. Nothing outside the app links to /sign-up; the login's "sign up" link reaches it.

## Provider dashboard requirements

- The redirect URL `beatly://auth/callback` is on the allow-list.
- The "Confirm signup" email template links to the redirect with `token_hash` and
  `type` (built from the token hash and the redirect URL, not the default
  confirmation URL).
- The minimum password length is 6. Changing it means changing
  `PASSWORD_MIN_LENGTH` in `apps/mobile/src/screens/signUp/signUpRules.ts`.

## Checked by hand

- Both screens against the layout of issue 25, on a device (screenshots in the PR).
- Sign up, email confirmation, login and logout end to end, on a device, with the
  real provider, a real email and the backend.
- The session persists across a restart, the token refreshes, and with an expired
  session and a network that never answers the screen reaches its error state in
  about 15 seconds.
- Cold start on iOS with a saved session: no frame of the login between the splash and the
  home. Cold start signed out: the splash goes straight to the login.
- The swap from the placeholder to the home does not show the home sliding in as the splash
  fades (the native stack's replace animation); if it does, it is fixed in the same change before merging.

On Android the `Input`s are the Material 3 outlined text field (ADR 027, `ui` `Input`; see DESIGN.md, Text field): outline, label inside rising onto it on focus or with text, accent outline on focus, error color and the error under the field; iOS unchanged. Left to verify by hand on an Android phone: the label animation feel, the notch over the card surface, TalkBack reading the label once and announcing the error.

The brand icon (ADR 029) unchanged on iOS and Android, also under iOS Smart Invert.
