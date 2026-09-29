// INFO: reads the three public build-time values (API base URL, auth URL and anon key); a missing one fails at app start.
/// <reference types="expo/types" />

export interface PublicEnv {
  readonly apiUrl: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

function required(name: string, value: string | undefined): string {
  if (value === undefined || value === "") throw new Error(`missing ${name}`);
  return value;
}

// Static member access on purpose: Expo inlines only static process.env reads.
export function readPublicEnv(): PublicEnv {
  return {
    apiUrl: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
    supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: required(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
