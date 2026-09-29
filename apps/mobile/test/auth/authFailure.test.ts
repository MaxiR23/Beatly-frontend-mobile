// apps/mobile/test/auth/authFailure.test.ts
//
// Tests for the auth failure mapping.
//
// Tested:
// - toAuthFailureReason
//
// What is covered:
// - every library code of the table maps to its port reason; unknown and missing codes map to unknown
//
// Run with: pnpm --filter @beatly/mobile test -- authFailure
//
// SEE: apps/mobile/src/auth/authFailure.ts

import type { AuthFailureReason } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { toAuthFailureReason } from "../../src/auth/authFailure.ts";

describe("toAuthFailureReason", () => {
  it.each<[string, AuthFailureReason]>([
    ["invalid_credentials", "invalid_credentials"],
    ["email_not_confirmed", "email_not_confirmed"],
    ["user_already_exists", "user_already_exists"],
    ["email_exists", "user_already_exists"],
    ["weak_password", "weak_password"],
    ["email_address_invalid", "invalid_email"],
    ["over_request_rate_limit", "rate_limited"],
    ["over_email_send_rate_limit", "rate_limited"],
    ["otp_expired", "link_invalid"],
  ])("maps %s to %s", (code, reason) => {
    expect(toAuthFailureReason({ code })).toBe(reason);
  });

  it("maps an unknown code to unknown", () => {
    expect(toAuthFailureReason({ code: "something_else" })).toBe("unknown");
  });

  it("maps a missing code to unknown", () => {
    expect(toAuthFailureReason({})).toBe("unknown");
  });
});
