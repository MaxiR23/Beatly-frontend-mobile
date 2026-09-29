// INFO: the typed error a query function throws for a failed outcome; screens branch on `outcome`, never on the message.
import type { ApiFailure, TransportFailure } from "@beatly/core";

export class OutcomeError extends Error {
  readonly outcome: ApiFailure | TransportFailure;

  constructor(outcome: ApiFailure | TransportFailure) {
    super(outcome.kind === "api_failure" ? outcome.reason : outcome.cause);
    this.name = "OutcomeError";
    this.outcome = outcome;
  }
}
