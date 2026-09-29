# 006. zod at the HTTP edge as the source of types

Why every API response is parsed by a zod schema in `core`, why the
domain types are inferred from those schemas and not written by hand,
and what happens to a body that does not match.

## Context

The legacy app had 311 `any` types, none of them suppressed with a
`@ts-ignore`: they were honest gaps, all at the same place, the
responses of the backend. Each handler accepted whatever shape arrived
and every screen guessed. The new contract is precise about shapes and
about nullability: a track's `track_id`, `album_id`, `thumbnail_url`
and `duration_seconds` can be `null` on several routes, and a client
that types them as required crashes on a legitimate response.

## Decision

- Every response body is parsed by a zod schema in
  `packages/core/src/domain/`, one module per API domain, before any
  code reads it. The envelope (`ok`, `data`, `reason`, `items`, `page`)
  has its own schema that every route schema is wrapped in.
- Domain types are `z.infer` of those schemas. There is no hand-written
  interface for a response.
- A schema mirrors the backend's domain file field by field, nullable
  exactly where the file says. A field the contract does not list is
  not in the schema.
- A body that fails its schema is a transport failure outcome, with the
  zod issue in the log and never in the UI. The client does not pass
  partial data through.
- Request bodies are typed the same way, so a required field the
  contract added is a compile error, not a 422 in production.

## Consequences

- A contract change is a schema change, and a schema change fails a
  test before it fails a screen. The four service test cases in
  `docs/testing.md` are written against schema-shaped fixtures.
- A `reason` is any snake_case string, not a closed enum: the backend
  can send one the contract does not list yet (for example
  `rate_limited`) and it stays an API failure instead of becoming a
  schema failure. The consequence is that the client schema no longer
  catches a typo in a `reason` comparison. Each service that branches
  on reasons declares a `z.enum` of the ones its screen handles, and
  compares against that, so a typo there is a type error.
- The transport failure has four causes: `timeout`, `network`,
  `schema` and `auth`. `auth` is a rejected access token read; calling
  it `network` would lie in the log, and it must still reach the
  screen as a typed outcome. One `timeoutMs` budget covers the token
  read and the send, so a token read that stalls is a `timeout`.
- zod is a dependency of `core` and adds to the bundle; accepted, it is
  the one library `core` is allowed to import directly because it has
  no platform in it.

Why the alternatives were rejected:

- Hand-written interfaces: unverified at runtime, which is how 311
  `any` types happen once the first one drifts.
- Generating types from the backend's OpenAPI document: the envelope
  and the `reason` values are documented by hand in the backend, not
  in the generated schema, and a generator does not give a runtime
  check. Worth revisiting if the backend starts publishing a typed
  contract.
- A smaller schema library: no disagreement with the idea, only with
  the timing; zod is what the team and the agents know, and swapping
  later is one module at a time.
