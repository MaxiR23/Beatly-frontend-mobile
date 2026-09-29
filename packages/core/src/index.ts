// INFO: public entry of @beatly/core: ports, the envelope, the HTTP client, the paginated helper and the services.
export type {
  AuthChange,
  AuthFailure,
  AuthFailureReason,
  AuthPort,
  AuthResult,
  AuthStatus,
  EmailLink,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from "./ports/auth.ts";
export type { HttpMethod, HttpPort, HttpRequest, HttpResponse } from "./ports/http.ts";
export type { LogFields, LogPort } from "./ports/log.ts";
export {
  apiReasonSchema,
  envelopeSchema,
  pageBlockSchema,
  paginatedSchema,
} from "./domain/envelope.ts";
export type { ApiReason, PageBlock } from "./domain/envelope.ts";
export type {
  ApiFailure,
  HttpOutcome,
  Success,
  TransportCause,
  TransportFailure,
} from "./http/outcome.ts";
export { DEFAULT_MAX_AGE_SECONDS, parseMaxAge } from "./http/cacheControl.ts";
export { DEFAULT_TIMEOUT_MS, createHttpClient } from "./http/client.ts";
export type { HttpClient, HttpClientDeps, QueryParams, RequestOptions } from "./http/client.ts";
export { fetchPage } from "./http/paginated.ts";
export type { FetchPageOptions, PageResult } from "./http/paginated.ts";
export { profileName, profileSchema } from "./domain/profile.ts";
export type { Profile } from "./domain/profile.ts";
export { createProfileService, profileReasonSchema } from "./services/profile.ts";
export type { ProfileReason, ProfileService } from "./services/profile.ts";
