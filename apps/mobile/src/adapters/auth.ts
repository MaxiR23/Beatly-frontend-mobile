// INFO: the auth adapter: the only importer of the auth library and expo-secure-store; implements the auth port.
import type { AuthPort } from "@beatly/core";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { createChunkedStorage } from "../auth/chunkedStorage.ts";

export interface AuthAdapterConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

export function createAuthAdapter(config: AuthAdapterConfig): AuthPort {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: createChunkedStorage({
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      }),
      storageKey: "beatly-session",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return {
    async getAccessToken() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session?.access_token ?? null;
    },
    onAuthChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener({ status: session ? "signed_in" : "signed_out" });
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },
  };
}
