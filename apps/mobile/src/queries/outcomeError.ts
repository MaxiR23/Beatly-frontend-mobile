// INFO: the typed error a query function throws for a failed outcome (http or storage); screens branch on `outcome`, never on the message.
import type { ApiFailure, StorageFailure, TransportFailure } from "@beatly/core";

export class OutcomeError extends Error {
  readonly outcome: ApiFailure | TransportFailure | StorageFailure;

  constructor(outcome: ApiFailure | TransportFailure | StorageFailure) {
    super(outcome.kind === "api_failure" ? outcome.reason : outcome.cause);
    this.name = "OutcomeError";
    this.outcome = outcome;
  }
}
