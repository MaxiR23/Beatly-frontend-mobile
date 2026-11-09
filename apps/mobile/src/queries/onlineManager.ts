// INFO: connects the network adapter to TanStack Query's onlineManager, the one source of truth for connectivity (queries pause offline, the strip and useOnline read it); also guards the stream resolver so that offline a track start fails at once with network instead of waiting for the resolver's timeout.
import type { StreamResolution, StreamResolver } from "@beatly/core";
import { onlineManager } from "@tanstack/react-query";

import { subscribeToConnection } from "../adapters/network.ts";

export function listenToConnection(): () => void {
  onlineManager.setEventListener((setOnline) => subscribeToConnection(setOnline));
  return () => {
    onlineManager.setEventListener(() => undefined);
  };
}

// Offline, a track start fails at once with network instead of waiting for the resolver's timeout (owner change 2, issue 163).
export function resolveOnlyOnline(resolver: StreamResolver): StreamResolver {
  return {
    resolve: (trackId) =>
      onlineManager.isOnline()
        ? resolver.resolve(trackId)
        : Promise.resolve<StreamResolution>({ kind: "failure", cause: "network" }),
  };
}
