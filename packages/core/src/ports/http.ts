// INFO: the http port: what core needs to send a request, in core's vocabulary and with no library type.
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly signal: AbortSignal;
}

export interface HttpResponse {
  readonly status: number;
  // Header names are lower-case; the adapter normalizes them.
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface HttpPort {
  // Rejects only for a transport problem (network, abort); any status with a body resolves.
  send(request: HttpRequest): Promise<HttpResponse>;
}
