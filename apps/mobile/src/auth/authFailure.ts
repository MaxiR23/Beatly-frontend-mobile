// INFO: maps the auth library's error codes to the port's failure reasons; pure, no library import.
import type { AuthFailureReason } from "@beatly/core";

export function toAuthFailureReason(error: {
  readonly code?: string | undefined;
}): AuthFailureReason {
  switch (error.code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "user_already_exists":
    case "email_exists":
      return "user_already_exists";
    case "weak_password":
      return "weak_password";
    case "email_address_invalid":
      return "invalid_email";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited";
    case "otp_expired":
      return "link_invalid";
    default:
      return "unknown";
  }
}
