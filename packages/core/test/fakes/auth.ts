// INFO: in-memory auth port: returns a fixed token and lets a test emit session changes.
import type { AuthChange, AuthPort } from "../../src/ports/auth.ts";

export interface FakeAuth {
  readonly port: AuthPort;
  emit(change: AuthChange): void;
}

export function createFakeAuth(token: string | null = "test-token"): FakeAuth {
  const listeners = new Set<(change: AuthChange) => void>();
  const port: AuthPort = {
    getAccessToken: () => Promise.resolve(token),
    getStatus: () => Promise.resolve(token === null ? "signed_out" : "signed_in"),
    signIn: () => Promise.resolve({ kind: "success" }),
    signUp: () => Promise.resolve({ kind: "confirmation_sent" }),
    signOut: () => Promise.resolve({ kind: "success" }),
    confirmEmail: () => Promise.resolve({ kind: "success" }),
    onAuthChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    port,
    emit(change) {
      for (const listener of listeners) listener(change);
    },
  };
}
