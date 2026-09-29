// INFO: the auth adapter: the only importer of the auth library and expo-secure-store; implements the auth port, including the sign operations and the app-state driven token refresh.
import { DEFAULT_TIMEOUT_MS } from "@beatly/core";
import type { AuthFailure, AuthPort, AuthResult, SignUpResult } from "@beatly/core";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

import { toAuthFailureReason } from "../auth/authFailure.ts";
import { createChunkedStorage } from "../auth/chunkedStorage.ts";
import { withTimeout } from "../auth/withTimeout.ts";

export interface AuthAdapterConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

const STORAGE_KEY = "beatly-session";
// The scheme is set in app.config.ts; the path is the callback route.
const EMAIL_REDIRECT = "beatly://auth/callback";
const UNKNOWN_FAILURE: AuthFailure = { kind: "failure", reason: "unknown" };

function failureOf(error: unknown): AuthFailure {
  if (typeof error === "object" && error !== null && "code" in error) {
    return {
      kind: "failure",
      reason: toAuthFailureReason({
        code: typeof error.code === "string" ? error.code : undefined,
      }),
    };
  }
  return UNKNOWN_FAILURE;
}

export function createAuthAdapter(config: AuthAdapterConfig): AuthPort {
  const storage = createChunkedStorage({
    getItem: SecureStore.getItemAsync,
    setItem: SecureStore.setItemAsync,
    removeItem: SecureStore.deleteItemAsync,
  });
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage,
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  AppState.addEventListener("change", (state) => {
    if (state === "active") void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  });

  // A failure outcome, never success or empty, so this catch swallows nothing.
  async function guarded<T extends AuthResult | SignUpResult>(operation: () => Promise<T>) {
    const run = async (): Promise<T | AuthFailure> => {
      try {
        return await operation();
      } catch (error) {
        return failureOf(error);
      }
    };
    return withTimeout<T | AuthFailure>(run(), DEFAULT_TIMEOUT_MS, UNKNOWN_FAILURE);
  }

  return {
    async getAccessToken() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session?.access_token ?? null;
    },
    async getStatus() {
      return (await storage.getItem(STORAGE_KEY)) === null ? "signed_out" : "signed_in";
    },
    onAuthChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener({ status: session ? "signed_in" : "signed_out" });
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },
    signIn({ email, password }) {
      return guarded<AuthResult>(async () => {
        const { error } = await client.auth.signInWithPassword({ email, password });
        return error ? failureOf(error) : { kind: "success" };
      });
    },
    signUp({ name, email, password }) {
      return guarded<SignUpResult>(async () => {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: name }, emailRedirectTo: EMAIL_REDIRECT },
        });
        if (error) return failureOf(error);
        return data.session ? { kind: "signed_in" } : { kind: "confirmation_sent" };
      });
    },
    signOut() {
      return guarded<AuthResult>(async () => {
        const { error } = await client.auth.signOut();
        return error ? failureOf(error) : { kind: "success" };
      });
    },
    confirmEmail({ tokenHash, type }) {
      return guarded<AuthResult>(async () => {
        const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
        return error ? failureOf(error) : { kind: "success" };
      });
    },
  };
}
