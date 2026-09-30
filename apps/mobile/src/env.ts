// INFO: reads the six public build-time values (API base URL, auth URL and anon key, and the stream endpoint, client name and version); a missing one fails at app start.
/// <reference types="expo/types" />

export interface PublicEnv {
  readonly apiUrl: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly streamEndpoint: string;
  readonly streamClientName: string;
  readonly streamClientVersion: string;
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
    streamEndpoint: required(
      "EXPO_PUBLIC_STREAM_ENDPOINT",
      process.env.EXPO_PUBLIC_STREAM_ENDPOINT,
    ),
    streamClientName: required(
      "EXPO_PUBLIC_STREAM_CLIENT_NAME",
      process.env.EXPO_PUBLIC_STREAM_CLIENT_NAME,
    ),
    streamClientVersion: required(
      "EXPO_PUBLIC_STREAM_CLIENT_VERSION",
      process.env.EXPO_PUBLIC_STREAM_CLIENT_VERSION,
    ),
  };
}
