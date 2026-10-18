// INFO: the profile service: the caller's own profile and its partial update, over the single HTTP client.
import { z } from "zod";

import { profileSchema, type Profile } from "../domain/profile.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

// The reasons PATCH /profile/me lists; GET /profile/me lists the four of them other than username_taken and invalid_request.
export const profileReasonSchema = z.enum([
  "username_taken",
  "invalid_request",
  "profile_not_found",
  "unauthorized",
  "upstream_error",
  "upstream_timeout",
]);
export type ProfileReason = z.infer<typeof profileReasonSchema>;

// Only the keys present are written; display_name null clears it, a username is never null (the backend rejects it).
export interface UpdateProfileInput {
  readonly username?: string;
  readonly display_name?: string | null;
}

export interface ProfileService {
  getMyProfile(): Promise<HttpOutcome<Profile>>;
  updateMyProfile(input: UpdateProfileInput): Promise<HttpOutcome<Profile>>;
}

export function createProfileService(client: HttpClient): ProfileService {
  return {
    getMyProfile: () => client.request({ path: "/profile/me", schema: profileSchema }),
    updateMyProfile: (input) =>
      client.request({ method: "PATCH", path: "/profile/me", body: input, schema: profileSchema }),
  };
}
