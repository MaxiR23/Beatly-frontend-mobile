// apps/mobile/test/screens/signUp/signUpRules.test.ts
//
// Tests for the sign up rules.
//
// Tested:
// - passwordRules
// - canSubmitSignUp
//
// What is covered:
// - the minimum length boundary and every reason the form cannot be submitted
//
// Run with: pnpm --filter @beatly/mobile test -- signUpRules
//
// SEE: apps/mobile/src/screens/signUp/signUpRules.ts

import { describe, expect, it } from "@jest/globals";

import { canSubmitSignUp, passwordRules } from "../../../src/screens/signUp/signUpRules.ts";

const valid = { name: "Maxi", email: "maxi@example.com", password: "123456" };

describe("passwordRules", () => {
  it("leaves minLength unmet at 5 characters", () => {
    expect(passwordRules("12345")).toEqual([{ id: "minLength", met: false }]);
  });

  it("meets minLength at 6 characters", () => {
    expect(passwordRules("123456")).toEqual([{ id: "minLength", met: true }]);
  });
});

describe("canSubmitSignUp", () => {
  it("is true for a valid form", () => {
    expect(canSubmitSignUp(valid)).toBe(true);
  });

  it("is false for an empty or whitespace-only name", () => {
    expect(canSubmitSignUp({ ...valid, name: "" })).toBe(false);
    expect(canSubmitSignUp({ ...valid, name: "   " })).toBe(false);
  });

  it("is false for a name longer than 50 characters", () => {
    expect(canSubmitSignUp({ ...valid, name: "a".repeat(51) })).toBe(false);
    expect(canSubmitSignUp({ ...valid, name: "a".repeat(50) })).toBe(true);
  });

  it("is false for an empty email", () => {
    expect(canSubmitSignUp({ ...valid, email: "  " })).toBe(false);
  });

  it("is false for a short password", () => {
    expect(canSubmitSignUp({ ...valid, password: "12345" })).toBe(false);
  });
});
