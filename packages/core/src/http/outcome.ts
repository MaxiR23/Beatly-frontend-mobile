// INFO: the three outcomes of an API call: success, API failure with its reason, transport failure.
import type { ApiReason } from "../domain/envelope.ts";

export interface Success<T> {
  readonly kind: "success";
  readonly data: T;
  readonly maxAgeSeconds: number;
}

export interface ApiFailure {
  readonly kind: "api_failure";
  readonly reason: ApiReason;
}

export type TransportCause = "timeout" | "network" | "schema" | "auth";

export interface TransportFailure {
  readonly kind: "transport_failure";
  readonly cause: TransportCause;
}

export type HttpOutcome<T> = Success<T> | ApiFailure | TransportFailure;
