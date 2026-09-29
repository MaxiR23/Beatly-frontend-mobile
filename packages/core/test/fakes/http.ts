// INFO: in-memory http port: handlers per "<METHOD> <path>" return the raw body and headers the real API would.
import type { HttpPort, HttpRequest } from "../../src/ports/http.ts";

export interface FakeRequest {
  readonly query: Record<string, string>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly signal: AbortSignal;
}

// A string body is sent raw; anything else is JSON.stringify'd.
export interface FakeResponse {
  readonly status?: number;
  readonly headers?: Record<string, string>;
  readonly body: unknown;
}

export type Handler = (req: FakeRequest) => FakeResponse | Promise<FakeResponse>;

export interface FakeHttp {
  readonly port: HttpPort;
  readonly requests: HttpRequest[];
}

export function never(): Promise<never> {
  return new Promise<never>(() => undefined);
}

export function createFakeHttp(handlers: Record<string, Handler>, baseUrl: string): FakeHttp {
  const requests: HttpRequest[] = [];
  const port: HttpPort = {
    async send(request) {
      requests.push(request);
      const withoutBase = request.url.startsWith(baseUrl)
        ? request.url.slice(baseUrl.length)
        : request.url;
      const [path = "", queryString = ""] = withoutBase.split("?");
      const query: Record<string, string> = {};
      for (const pair of queryString.split("&")) {
        if (pair === "") continue;
        const [key = "", value = ""] = pair.split("=");
        query[decodeURIComponent(key)] = decodeURIComponent(value);
      }
      const handler = handlers[`${request.method} ${path}`];
      if (handler === undefined) {
        throw new Error(`unhandled route ${request.method} ${path}`);
      }
      const response = await handler({
        query,
        headers: request.headers,
        ...(request.body !== undefined ? { body: request.body } : {}),
        signal: request.signal,
      });
      return {
        status: response.status ?? 200,
        headers: response.headers ?? {},
        body: typeof response.body === "string" ? response.body : JSON.stringify(response.body),
      };
    },
  };
  return { port, requests };
}
