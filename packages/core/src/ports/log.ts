// INFO: the log port: structured logging, the only output channel of core.
export type LogFields = Readonly<Record<string, string | number | boolean | null>>;

export interface LogPort {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}
