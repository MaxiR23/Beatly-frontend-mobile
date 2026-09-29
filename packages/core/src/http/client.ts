// INFO: the single HTTP client: turns every call into a success, an API failure or a transport failure, and never throws.
import type { z } from "zod";

import { envelopeSchema } from "../domain/envelope.ts";
import type { AuthPort } from "../ports/auth.ts";
import type { HttpMethod, HttpPort } from "../ports/http.ts";
import type { LogPort } from "../ports/log.ts";
import { parseMaxAge } from "./cacheControl.ts";
import type { HttpOutcome } from "./outcome.ts";

export const DEFAULT_TIMEOUT_MS = 15_000;

export type QueryParams = Readonly<Record<string, string | number | boolean | undefined>>;

export interface RequestOptions<T> {
  readonly method?: HttpMethod;
  readonly path: string;
  readonly query?: QueryParams;
  readonly body?: unknown;
  // The schema of `data`, not of the envelope.
  readonly schema: z.ZodType<T>;
}

export interface HttpClient {
  request<T>(options: RequestOptions<T>): Promise<HttpOutcome<T>>;
}

export interface HttpClientDeps {
  readonly http: HttpPort;
  readonly auth: AuthPort;
  readonly log: LogPort;
  readonly baseUrl: string;
  readonly timeoutMs?: number;
}

const TIMED_OUT = Symbol("timed_out");

function buildUrl(baseUrl: string, path: string, query: QueryParams | undefined): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const pairs: string[] = [];
  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs.length === 0 ? `${base}${path}` : `${base}${path}?${pairs.join("&")}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function createHttpClient(deps: HttpClientDeps): HttpClient {
  const { http, auth, log, baseUrl } = deps;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(options: RequestOptions<T>): Promise<HttpOutcome<T>> {
    const { path } = options;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One budget covers the token read and the send.
    const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => {
        resolve(TIMED_OUT);
        controller.abort();
      }, timeoutMs);
    });

    let response;
    try {
      let token: string | null;
      const reading = auth.getAccessToken();
      try {
        const readRaced = await Promise.race([reading, timeout]);
        if (readRaced === TIMED_OUT) {
          // A late rejection of the abandoned token read must not surface as unhandled.
          reading.catch(() => undefined);
          log.warn("http.timeout", { path, timeoutMs });
          return { kind: "transport_failure", cause: "timeout" };
        }
        token = readRaced;
      } catch {
        log.warn("http.auth_failed", { path });
        return { kind: "transport_failure", cause: "auth" };
      }

      const headers: Record<string, string> = { accept: "application/json" };
      if (options.body !== undefined) headers["content-type"] = "application/json";
      if (token !== null) headers.authorization = `Bearer ${token}`;

      try {
        const sent = http.send({
          method: options.method ?? "GET",
          url: buildUrl(baseUrl, path, options.query),
          headers,
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
          signal: controller.signal,
        });
        // The timer must win even if the port ignores the signal.
        const raced = await Promise.race([sent, timeout]);
        if (raced === TIMED_OUT) {
          // A late rejection of the abandoned send must not surface as unhandled.
          sent.catch(() => undefined);
          log.warn("http.timeout", { path, timeoutMs });
          return { kind: "transport_failure", cause: "timeout" };
        }
        response = raced;
      } catch (error) {
        log.warn("http.network", { path, message: errorMessage(error) });
        return { kind: "transport_failure", cause: "network" };
      }
    } finally {
      clearTimeout(timer);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(response.body);
    } catch {
      log.warn("http.schema", { path, status: response.status, issue: "body is not JSON" });
      return { kind: "transport_failure", cause: "schema" };
    }

    const parsed = envelopeSchema(options.schema).safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
        .join("; ");
      log.warn("http.schema", { path, status: response.status, issues });
      return { kind: "transport_failure", cause: "schema" };
    }

    const envelope = parsed.data;
    if (!envelope.ok) return { kind: "api_failure", reason: envelope.reason };
    return {
      kind: "success",
      data: envelope.data,
      maxAgeSeconds: parseMaxAge(response.headers["cache-control"]),
    };
  }

  return { request };
}
