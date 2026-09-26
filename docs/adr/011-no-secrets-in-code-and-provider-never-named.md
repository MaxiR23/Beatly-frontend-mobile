# 011. No secrets in the code; the external provider is never named

Why the only environment values are three public ones, why nothing
else in the client is a secret, and why the external provider is never
named in code, docs, tests, commits, issues or pull requests.

## Context

The legacy repo is public. It carried a hardcoded fallback identifier
for the external provider's player endpoint, the endpoint's URL and
client name in environment variables inlined into the bundle, feature
flags as lists of user ids in `EXPO_PUBLIC_*` variables, and iOS
transport security disabled for every host. None of it was a leaked
key, but all of it was the client's own knowledge of a provider it
should not have had a relationship with.

In this repo the client talks to the Beatly API and to Supabase auth,
and to nothing else. The backend owns the provider, and the backend's
own docs already refer to it only as "the external provider".

## Decision

- The environment holds exactly three values: the API base URL, the
  Supabase URL and the Supabase anon key. All three are public by
  design and end up in the bundle; `.env.example` lists them and
  nothing else.
- There is no secret in the client. A value that must stay secret has
  no place in a bundle that ships to app stores, so it does not exist
  here; whatever needs it lives in the backend.
- Feature flags, roles and permissions come from the API (the profile's
  role), never from a list in the bundle.
- The external provider is never named: not in code, comments,
  fixtures, tests, docs, commit messages, issues or pull requests. It
  is "the external provider". Identifiers, hostnames and id formats
  that reveal it do not appear either. Fixtures captured from a dev run
  are scrubbed before they are committed.
- `review-changes` greps every diff for `https://` literals outside the
  config adapter and for the provider's name and hostnames as the repo
  owner lists them in the invocation.

## Consequences

- Rotating anything means rotating it in the backend or in Supabase;
  the client needs no release.
- The client has no idea where audio or catalog data comes from, which
  is what lets the backend change providers without a client change.
- The repo's visibility can change without an audit of its history.
- A contributor who needs the provider's name to do a task is doing a
  backend task.

Why the alternatives were rejected:

- Remote config for "semi-secret" values: a value fetched into a client
  is in memory and in network logs; the fix is not needing it.
- Naming the provider in private documentation only: documentation
  gets copied into issues, PRs and chats, and the boundary moves with
  it. One rule everywhere is easier to keep than a rule with a map of
  exceptions.
- Disabling transport security for a host: no host the client talks to
  needs it.
