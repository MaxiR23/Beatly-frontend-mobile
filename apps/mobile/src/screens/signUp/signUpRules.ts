// INFO: the sign up rules the screen shows as the user types; they mirror what the auth provider and the database enforce.
// Mirrors the auth provider's minimum password length, set in its dashboard (docs/features/auth.md).
export const PASSWORD_MIN_LENGTH = 6;
// Mirrors profiles_display_name_length: the signup trigger fails above it.
export const NAME_MAX_LENGTH = 50;

export type PasswordRuleId = "minLength";

export function passwordRules(password: string): readonly { id: PasswordRuleId; met: boolean }[] {
  return [{ id: "minLength", met: password.length >= PASSWORD_MIN_LENGTH }];
}

export function canSubmitSignUp(input: {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}): boolean {
  const name = input.name.trim();
  return (
    name.length >= 1 &&
    name.length <= NAME_MAX_LENGTH &&
    input.email.trim().length > 0 &&
    passwordRules(input.password).every((rule) => rule.met)
  );
}
