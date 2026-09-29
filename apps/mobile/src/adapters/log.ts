// INFO: the log adapter: the only file that writes to the console; implements the log port.
import type { LogFields, LogPort } from "@beatly/core";

type Level = "debug" | "info" | "warn" | "error";

function at(level: Level) {
  return (message: string, fields?: LogFields): void => {
    if (fields === undefined) console[level](message);
    else console[level](message, fields);
  };
}

export function createLogAdapter(): LogPort {
  return { debug: at("debug"), info: at("info"), warn: at("warn"), error: at("error") };
}
