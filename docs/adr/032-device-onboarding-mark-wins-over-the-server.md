# 032. The device onboarding mark wins over the server

## Context

The route gate must decide between the onboarding and home. The server says it through
`onboarding_completed_at` in `GET /profile/me`, but a cold start would then wait for the network
before drawing anything, and a failed read would block a user who already finished the onboarding.

## Decision

- After the onboarding is done, the device stores a mark under `beatly-onboarded` in the plain store
  (`StoragePort`). Its value is the account's user id.
- The gate trusts the mark over the profile: a mark stored for the signed-in account opens home without
  waiting for `GET /profile/me`, and nothing ever undoes it. Without a mark for this account, the
  profile's `onboarding_completed_at` decides, and a profile that says done stores the mark.
- The mark is scoped by the account through a new `AuthPort` method, `getUserId()`, read from the
  stored session like `getEmail()` and never through a network refresh. One mark is kept per phone: a
  different account on the same phone does not match it and is decided by its profile.
- The user id was preferred over the email as the value, so the email is not written in clear in the
  plain store.

## Consequences

- A cold start of a finished account does not wait for the network.
- A phone keeps one mark: signing in with another account replaces it once that account is done.
- If the server later resets `onboarding_completed_at`, a device with the mark still opens home.
- An unreadable mark falls back to the profile, so a storage failure never blocks the user.
- Rejected: the email as the value (written in clear); the profile alone (every cold start waits for
  the network and a failed read blocks a finished account).
