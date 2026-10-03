// INFO: owns the session status for the route gate; on sign out clears the query cache (ADR 007), stops playback and clears the likes mirror; syncs the mirror on sign in, at start with a stored session and on every return to the foreground, and refreshes the library and the liked playlist when a like is confirmed.
import type { AuthStatus } from "@beatly/core";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { libraryQueryKey } from "../queries/useLibrary.ts";
import { likedPlaylistQueriesKey } from "../queries/usePlaylist.ts";
import { useCore } from "./CoreProvider.tsx";

interface Session {
  readonly status: "unknown" | AuthStatus;
}

const SessionContext = createContext<Session>({ status: "unknown" });

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const { auth, likes, log, playback } = useCore();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Session["status"]>("unknown");

  useEffect(() => {
    let current: Session["status"] = "unknown";
    let active = true;
    const apply = (next: AuthStatus) => {
      if (!active) return;
      if (current === "signed_in" && next === "signed_out") {
        queryClient.clear();
        playback.stop();
        void likes.clear();
      }
      if (next === "signed_in" && current !== "signed_in") void likes.sync();
      current = next;
      setStatus(next);
    };
    const unsubscribe = auth.onAuthChange((change) => {
      apply(change.status);
    });
    auth.getStatus().then(
      (stored) => {
        if (current === "unknown") apply(stored);
      },
      () => {
        log.warn("session.status_unreadable");
      },
    );
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active" && current === "signed_in") void likes.sync();
    });
    const confirmed = likes.onConfirmed(() => {
      void queryClient.invalidateQueries({ queryKey: libraryQueryKey });
      void queryClient.invalidateQueries({ queryKey: likedPlaylistQueriesKey });
    });
    return () => {
      active = false;
      unsubscribe();
      appState.remove();
      confirmed();
    };
  }, [auth, likes, log, playback, queryClient]);

  return <SessionContext.Provider value={{ status }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  return useContext(SessionContext);
}
