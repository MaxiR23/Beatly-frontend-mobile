// INFO: in-memory log port: every call is an entry in an array a test can read.
import type { LogFields, LogPort } from "../../src/ports/log.ts";

export interface LogEntry {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly fields: LogFields | undefined;
}

export interface FakeLog {
  readonly port: LogPort;
  readonly entries: LogEntry[];
}

export function createFakeLog(): FakeLog {
  const entries: LogEntry[] = [];
  const at =
    (level: LogEntry["level"]) =>
    (message: string, fields?: LogFields): void => {
      entries.push({ level, message, fields });
    };
  return {
    entries,
    port: { debug: at("debug"), info: at("info"), warn: at("warn"), error: at("error") },
  };
}
