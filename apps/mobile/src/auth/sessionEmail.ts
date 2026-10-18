// INFO: the email of the auth library's stored session JSON, read without the network; null without a session or an email; a value that is not JSON throws, as an unreadable store does.
export function sessionEmail(stored: string | null): string | null {
  if (stored === null) return null;
  const session: unknown = JSON.parse(stored);
  if (typeof session !== "object" || session === null || !("user" in session)) return null;
  const user = session.user;
  if (typeof user !== "object" || user === null || !("email" in user)) return null;
  return typeof user.email === "string" && user.email !== "" ? user.email : null;
}
