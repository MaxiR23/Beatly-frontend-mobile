// INFO: wires the adapters and the services once, at app start; takes no argument so route tests can replace this module.
import { createHttpClient, createProfileService } from "@beatly/core";
import type { AuthPort, LogPort, ProfileService } from "@beatly/core";

import { createAuthAdapter } from "./adapters/auth.ts";
import { createHttpAdapter } from "./adapters/http.ts";
import { createLogAdapter } from "./adapters/log.ts";
import { readPublicEnv } from "./env.ts";

export interface Core {
  readonly auth: AuthPort;
  readonly log: LogPort;
  readonly profile: ProfileService;
}

export function createCore(): Core {
  const env = readPublicEnv();
  const log = createLogAdapter();
  const auth = createAuthAdapter({
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  });
  const client = createHttpClient({
    http: createHttpAdapter(),
    auth,
    log,
    baseUrl: env.apiUrl,
  });
  return { auth, log, profile: createProfileService(client) };
}
