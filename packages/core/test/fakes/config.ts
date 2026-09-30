// INFO: in-memory config port: an object literal with neutral test values.
import type { ConfigPort } from "../../src/ports/config.ts";

export function createFakeConfig(): ConfigPort {
  return {
    streamEndpoint: "test://stream/resolve",
    streamClientName: "test-client",
    streamClientVersion: "0.0-test",
  };
}
