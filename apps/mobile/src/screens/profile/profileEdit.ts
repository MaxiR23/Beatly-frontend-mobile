// INFO: the edit-profile rules the sheet shows as the user types, mirroring PATCH /profile/me (display_name 1 to 50 characters or null, username 3 to 30 of [a-zA-Z0-9_], never cleared), and the PATCH body of only the changed fields, or null when nothing changed.
import type { UpdateProfileInput } from "@beatly/core";

export const NAME_MAX_LENGTH = 50;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export type UsernameProblem = "required" | "tooShort" | "tooLong" | "invalid";

interface Original {
  display_name: string | null;
  username: string | null;
}

interface Form {
  name: string;
  username: string;
}

// The backend counts code points; string.length counts UTF-16 units, so an emoji would count twice.
export function nameLength(name: string): number {
  return Array.from(name.trim()).length;
}

export function isNameTooLong(name: string): boolean {
  return nameLength(name) > NAME_MAX_LENGTH;
}

export function normalName(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

// An unchanged field is never validated and never sent.
export function usernameProblem(original: string | null, value: string): UsernameProblem | null {
  if (value === (original ?? "")) return null;
  if (value === "") return "required";
  if (!USERNAME_PATTERN.test(value)) return "invalid";
  const length = Array.from(value).length;
  if (length < USERNAME_MIN_LENGTH) return "tooShort";
  if (length > USERNAME_MAX_LENGTH) return "tooLong";
  return null;
}

export function profileEditPatch(original: Original, form: Form): UpdateProfileInput | null {
  const name = normalName(form.name);
  const nameChanged = name !== normalName(original.display_name);
  const usernameChanged = form.username !== (original.username ?? "");
  if (!nameChanged && !usernameChanged) return null;
  return {
    ...(nameChanged ? { display_name: name } : {}),
    ...(usernameChanged ? { username: form.username } : {}),
  };
}

export function canSaveProfile(original: Original, form: Form): boolean {
  return (
    profileEditPatch(original, form) !== null &&
    !isNameTooLong(form.name) &&
    usernameProblem(original.username, form.username) === null
  );
}
