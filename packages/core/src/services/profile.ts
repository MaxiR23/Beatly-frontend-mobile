// INFO: the profile service: the caller's own profile, over the single HTTP client.
import { z } from "zod";

import { profileSchema, type Profile } from "../domain/profile.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export const profileReasonSchema = z.enum(["profile_not_found"]);
export type ProfileReason = z.infer<typeof profileReasonSchema>;

export interface ProfileService {
  getMyProfile(): Promise<HttpOutcome<Profile>>;
}

export function createProfileService(client: HttpClient): ProfileService {
  return {
    getMyProfile: () => client.request({ path: "/profile/me", schema: profileSchema }),
  };
}
