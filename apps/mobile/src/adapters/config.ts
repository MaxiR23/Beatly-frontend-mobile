// INFO: the config adapter: hands core the stream values read from the build-time env; implements the config port.
import type { ConfigPort } from "@beatly/core";

import type { PublicEnv } from "../env.ts";

export function createConfigAdapter(env: PublicEnv): ConfigPort {
  return {
    streamEndpoint: env.streamEndpoint,
    streamClientName: env.streamClientName,
    streamClientVersion: env.streamClientVersion,
  };
}
