# 036. One connectivity source and the library's default reachability probe

## Context

Issue 163 adds an offline state: queries pause, a strip shows, and playing a track while offline fails at once. Owner change 3 asked to detect Wi-Fi without internet on iOS too. On iOS the connectivity library has no native verdict on reachability, so it runs its own JS probe: by default a `HEAD` request to a third-party URL, every 60 s while reachable and every 5 s otherwise. That is an HTTP request outside the `core` client, to a host that is not ours, and it contradicted "No HTTP call outside `core`" and "Every other byte goes through the backend API".

## Decision

- The connectivity library's reachability probe is kept at its default URL, a third-party host, and is the one HTTP request outside the `core` client (besides the stream resolver, ADR 021). `adapters/network.ts` does not configure it. "Offline" therefore reflects only the phone's internet, and a backend outage keeps showing the `server` cause instead of reading as offline.
- Online means `isConnected !== false && isInternetReachable !== false`; `null` (not known yet) counts as online. On Android the OS supplies reachability and no probe runs.
- One connection source: `adapters/network.ts` feeds TanStack Query's `onlineManager` (`QueryProvider`), and every reader (the strip, `useOnline`, the stream guard) reads that.
- Local queries and mutations (the device database, storage) use `networkMode: "always"`: they do not need the network and must not pause offline.
- Offline, a track start fails at once with `network` (`resolveOnlyOnline` wraps the stream resolver) and is not retried automatically.
- A play that could not start offline (play all of a paged list) is kept in a small module store (`screens/connection/playStart.ts`): the strip shows it until it is tapped, its screen leaves or another source starts, and tapping runs that play again.
- The error boundary is exported from each route of the root stack, not from the root layout: from the root layout it would replace the providers (no core, no log port) and its retry would remount the layout, building a second player while the first may still be playing.
- A network error while online shows the offline copy and does not reload by itself; the retry is the user's.
- Rejected: probing the API's `/health` route (a backend outage would read as offline and pause every query, and the screen would say "check your wifi" when the fault is ours); turning the probe off on iOS (the library then reports `isInternetReachable: false` forever, and Wi-Fi without internet would go undetected).

## Consequences

- CLAUDE.md names the library's own probe as an exception to "No HTTP call outside `core`".
- The probe adds a small periodic request to a third-party host on iOS while the app runs.
