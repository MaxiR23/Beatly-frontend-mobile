// INFO: the profile schema of GET /profile/me and the name the app shows for it.
import { z } from "zod";

export const profileSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "tester", "developer", "admin"]),
  // Nullable: the signup trigger leaves it NULL until the user picks one.
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

// The name the app shows: username, or display_name when username is empty (null).
export function profileName(profile: Profile): string | null {
  return profile.username ?? profile.display_name;
}
