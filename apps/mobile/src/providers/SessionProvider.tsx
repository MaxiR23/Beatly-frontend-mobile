// INFO: owns the session status for the route gate and clears the query cache on sign out (ADR 007).
import type { AuthStatus } from "@beatly/core";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useCore } from "./CoreProvider.tsx";

interface Session {
  readonly status: "unknown" | AuthStatus;
}

const SessionContext = createContext<Session>({ status: "unknown" });

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const { auth, log } = useCore();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Session["status"]>("unknown");

  useEffect(() => {
    let current: Session["status"] = "unknown";
    let active = true;
    const apply = (next: AuthStatus) => {
      if (!active) return;
      if (current === "signed_in" && next === "signed_out") queryClient.clear();
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
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth, log, queryClient]);

  return <SessionContext.Provider value={{ status }}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  return useContext(SessionContext);
}
