# Onboarding

The three steps a new account goes through before its home: pick artists, building your home, welcome.

## Purpose

A signed-in user whose profile has no `onboarding_completed_at` picks between 5 and 20 artists. The
backend completes the onboarding and generates the recommendations that build the home. "Empezar"
leads to home (or to the cold link the app kept). The screens only draw what the API returns.

## Layout

Background `color.surface.base` in the three steps. Tokens, by step:

- Pick: `typography.display` title, `body` secondary subtitle, `layout.gutter`, `spacing.md` and
  `spacing.lg` between tiles and rows, `border.widthFocused` ring in `color.accent.primary`, a check
  badge of `icon.size.lg`, `motion.enterScale` with `motion.spring` for the pop, `motion.duration.slow`
  for the similar row, a fixed bottom button over a `GradientFill` from `color.overlay.clear` to
  `color.surface.base`, `spacing.xxl` above it and `layout.controlHeight`.
- Building: `icon.size.hero` logo (`layout.logoBars`, `motion.logo`), `typography.title`,
  `motion.duration.phrase` and `motion.duration.base` for the phrases.
- Welcome: `layout.welcomePhoto` photos overlapped by `spacing.lg` with a `border.widthFocused`
  outline, `typography.display`, `body` secondary, `motion.detailCascade.*` for the entrance.

## Platform differences

None.

## States

| Step     | State               | What is drawn                                                                                                                                              | i18n keys                                                                                |
| -------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Pick     | Loading             | `LoadingState` in the grid                                                                                                                                 | `common:loading`                                                                         |
| Pick     | With data           | rows of three round covers, the picked ones with ring and check, a row of each picked artist's similar artists (none when the route returns none or fails) | `onboarding:pick.title`, `pick.subtitle`, `pick.search`, `pick.clearSearch`              |
| Pick     | Expected empty      | `EmptyState` (user icon), the search stays                                                                                                                 | `onboarding:pick.empty`                                                                  |
| Pick     | Error with retry    | `ErrorState`                                                                                                                                               | `common:error.generic`, `common:retry`                                                   |
| Pick     | Search loading      | `LoadingState`                                                                                                                                             | `common:loading`                                                                         |
| Pick     | Search result       | the one artist found                                                                                                                                       |                                                                                          |
| Pick     | Search no result    | `EmptyState` (search icon)                                                                                                                                 | `onboarding:pick.noResults`                                                              |
| Pick     | Search error        | `ErrorState` that retries the search                                                                                                                       | `common:error.generic`, `common:retry`                                                   |
| Pick     | `too_few_artists`   | the picks kept and a notice above the search                                                                                                               | `onboarding:pick.tooFew`                                                                 |
| Pick     | Bottom button       | disabled "Elegí N más" below 5, then "Continuar (N)"                                                                                                       | `onboarding:pick.more`, `pick.continue`                                                  |
| Building | Working             | the logo, the title and the phrases                                                                                                                        | `onboarding:building.title`, `building.phrases.similar`, `.albums`, `.almost`            |
| Building | Error with retry    | `ErrorState`; retry sends the same artists again                                                                                                           | `common:error.generic`, `common:retry`                                                   |
| Welcome  | With data           | up to five photos in pick order, the greeting, the text and the button                                                                                     | `onboarding:welcome.greeting`, `welcome.greetingNoName`, `welcome.text`, `welcome.start` |
| Gate     | Deciding            | the loading state on the placeholder route (under the splash on a cold start)                                                                              | `common:loading`                                                                         |
| Gate     | Profile read failed | `ErrorState` with retry on the placeholder route (loading while it retries)                                                                                | `common:error.generic`, `common:retry`, `common:loading`                                 |

Reduce motion: the logo bars, the phrases, the pop, the similar row's fade and the welcome cascade are at rest.

## Data

| Route                            | Paginated                               | Cache-Control                               | Reasons the screen branches on                                                       | Schema                                         |
| -------------------------------- | --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `GET /onboarding/artists`        | yes (`fetchPage` and `useInfiniteList`) | `private, no-cache`: stale at once          | `invalid_cursor` is handled by the shared helper; the rest is the generic error      | `onboardingArtistSchema`                       |
| `POST /onboarding/complete`      | no                                      | `private, no-cache`                         | `too_few_artists` maps to `onboarding:pick.tooFew`; the rest is the error with retry | `onboardingCompletionSchema`                   |
| `POST /recommendations/generate` | no                                      | `private, no-cache`                         | none; any failure is the error with retry                                            | `recommendationsSchema`                        |
| `GET /profile/me`                | no                                      | `private, no-cache`                         | none; a failure is the gate's error with retry                                       | `profileSchema` with `onboarding_completed_at` |
| `GET /search?q=` (reused)        | no                                      | `max-age`                                   | none                                                                                 | reads only `data.artist`, at most one          |
| `POST /onboarding/similar`       | no (cap of 3)                           | `private, no-cache`; a mutation, not cached | none; an empty list or any failure adds no row                                       | `onboardingSimilarSchema`, drawn as returned   |

The search finds zero or one artist per query (`data.artist`). Each pick asks
`POST /onboarding/similar` for that artist, one request at a time in pick order, with `exclude_ids`
holding every id on screen once: the curated artists, the search result, the picked artists and the
similar artists already returned. The row draws what the route returns; an empty list or a failure
adds no row. The requests start only once `GET /onboarding/artists` has loaded, so the exclusion is
complete: an artist picked from the search while the curated list is pending or in error gets no
request yet, and is asked after the list loads (after the user's retry); if the list stays in error,
that pick gets no row. Known limit: past about 56 distinct picks in one run `exclude_ids` exceeds the
route's 200 ids, the route answers 422 `invalid_request` and that pick gets no row; the client does not
trim the list.
"Continuar" calls `finish` of the onboarding service: complete, then generate; the first failure is
returned.

Device mark: not API data. After the profile reads `onboarding_completed_at` set, or after "Empezar", the
device stores the account's user id under `beatly-onboarded` (storage port). A start whose stored id is the
signed-in account's opens home without waiting for `GET /profile/me`; another account's id, nothing stored
or an unreadable store waits for the profile. Once stored it is never undone.

## Navigation

The route is `/onboarding`, guarded by the gate (`useOnboardingGate`): signed in, with the device mark not
stored for the account and `onboarding_completed_at` null. The mark stored for the account opens home at
once. "Empezar" writes the completion into the cached profile; the gate turns `home` and the guard
redirects to `/` or to the cold link the app kept (opened with the tab's anchor, so back lands on home).

## i18n namespace

`onboarding` and `common`.

## Checked by hand

- The equalizer's look and rhythm, the pop, the similar row's fade, the phrase fade and the welcome cascade on iOS and Android.
- No visual flash between the splash, the placeholder and the onboarding or home on a cold start.
- The fixed button's gradient over a scrolled grid, and the safe-area bottom with and without a home indicator.
- The real `POST /onboarding/similar` against the API: rows appear within a moment of each pick, and quick picks in a row never repeat an artist.
- The real `POST /onboarding/complete` and `POST /recommendations/generate` against the API (latency up to the 12 s budget) and the real curated photos.
- Reduce motion toggled in the system settings.
- A cold start of a finished account in airplane mode opens home (its data draws its own error states) instead of the profile error.
- A second account signing in on the same phone sees the onboarding if it has not done it.
