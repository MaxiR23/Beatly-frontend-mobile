// INFO: the http adapter: the only file that calls the global fetch; implements the http port.
import type { HttpPort } from "@beatly/core";

export function createHttpAdapter(): HttpPort {
  return {
    async send(request) {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        ...(request.body !== undefined ? { body: request.body } : {}),
        signal: request.signal,
      });
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        headers[name.toLowerCase()] = value;
      });
      return { status: response.status, headers, body: await response.text() };
    },
  };
}
