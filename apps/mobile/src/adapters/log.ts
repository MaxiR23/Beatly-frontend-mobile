// INFO: the log adapter: the only file that writes to the console; implements the log port.
// The debug level writes only in development builds; the other levels always write.
import type { LogFields, LogPort } from "@beatly/core";

type Level = "debug" | "info" | "warn" | "error";

function at(level: Level) {
  return (message: string, fields?: LogFields): void => {
    if (fields === undefined) console[level](message);
    else console[level](message, fields);
  };
}

export function createLogAdapter(dev: boolean = __DEV__): LogPort {
  return {
    debug: dev ? at("debug") : () => undefined,
    info: at("info"),
    warn: at("warn"),
    error: at("error"),
  };
}
