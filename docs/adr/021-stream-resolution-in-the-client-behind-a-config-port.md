# 021. Stream resolution in the client behind a config port

Why the client resolves a track's audio stream URL itself, from three
public build-time values behind a `config` port, instead of receiving it
from the backend.

## Context

The backend does not expose stream URLs, and the first playable build
cannot wait for that route. A backend route would not solve it either:
the external provider's stream URLs are bound to the IP that resolves
them, so a backend on a server would hand the phone a URL it cannot play,
unless it relayed all the audio. The URL has to be resolved by the device
that plays it.

The external provider's resolution endpoint answers unauthenticated
requests that carry a client name and version, locale fields and an
identifier the endpoint itself issues; without a valid identifier it can
refuse with a login-required status. None of the three configured values
(the endpoint, the client name, the client version) is a secret, and the
identifier is issued to the device, never written in the code.

## Decision

- `packages/core/src/services/streams.ts` resolves a track's stream URL
  through the `http` port, with a timeout (the HTTP client's default) and
  a zod schema. It chooses the format from an explicit per-platform table
  (iOS: `audio/mp4` only; Android: `audio/mp4`, then `audio/webm`), taking
  the highest bitrate in the first container that has a playable format,
  never ordering by the provider's format number. A failure is a typed
  `StreamResolution` (`unplayable`, `timeout`, `network`,
  `invalid_response`); there is no null URL.
- The resolver is the one caller of the `http` port besides the HTTP
  client: the endpoint does not answer the Beatly envelope, so the client
  cannot read it. It never sends the session token.
- A `config` port exposes `streamEndpoint`, `streamClientName` and
  `streamClientVersion`, read from `EXPO_PUBLIC_STREAM_ENDPOINT`,
  `EXPO_PUBLIC_STREAM_CLIENT_NAME` and `EXPO_PUBLIC_STREAM_CLIENT_VERSION`
  in `apps/mobile/src/env.ts` and handed to `core` by
  `apps/mobile/src/adapters/config.ts`. `.env.example` lists six public
  values, all empty.
- The resolver sends fixed locale fields (language `en`, region `US`) and
  the identifier the endpoint last issued, kept under
  `beatly-stream-identifier` in the `storage` port and sent on every
  request. On a login-required answer without stream data it takes the
  fresh identifier that answer carries, or discards the stored one and
  sends none, and retries once; a second refusal is `unplayable`. No
  identifier is hardcoded; a store that cannot be read or written only
  means sending or keeping none.
- The provider is still never named, in code, env names, docs or commits,
  and no provider identifier appears in tests: no hostname, no client name
  value, no format number, no real track id.
- This record supersedes `004-expo-audio-behind-the-player-port.md` where
  it says the stream URL comes from the backend and the client does not
  resolve audio, and `011-no-secrets-in-code-and-provider-never-named.md`
  where it says the environment holds exactly three values and the client
  talks to the Beatly API and Supabase auth and to nothing else. The rest
  of both records stands.

## Consequences

- The superseded statements are listed in the Corrections of
  `docs/adr/README.md`; records 004 and 011 stay as written. CLAUDE.md's
  env rule names the three stream values, and its HTTP rule names the
  resolver as the second caller of the `http` port.
- The endpoint's request and response field names appear in two files,
  `packages/core/src/services/streams.ts`, because its schema has to name
  them, and `packages/core/test/services/streams.test.ts`, because its
  fixtures and its request-body assertion have to spell them out.
  Someone who knows the provider can recognize them there. That includes
  the identifier field and the one playability status the resolver
  branches on.
- The device keeps an identifier issued by the external provider in plain
  key-value storage. It is not a secret and is never logged.
- The client knows where audio comes from: changing providers needs a
  client release.
- Every play resolves a fresh URL and nothing caches one, so there is no
  cache time to take from `Cache-Control`. A URL resolved on one network
  can stop playing after the phone changes network; that reaches the
  player as a playback error with a retry, which resolves again.
- When the backend can hand out a URL the phone can play (a relay, or a
  provider whose URLs are not bound to an IP), a new record moves
  resolution back and drops the three values.

Why the alternatives were rejected:

- A backend route returning the URL: the URL would be bound to the
  server's IP, so the phone could not play it.
- A backend relay of the audio: every byte of every play through the
  backend, for a first playable build.
