// INFO: the config port: the public build-time values core needs, today the stream endpoint and the client name and version it sends (ADR 021).
export interface ConfigPort {
  readonly streamEndpoint: string;
  readonly streamClientName: string;
  readonly streamClientVersion: string;
}
