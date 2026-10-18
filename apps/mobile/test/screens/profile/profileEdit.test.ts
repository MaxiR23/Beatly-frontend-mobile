// apps/mobile/test/screens/profile/profileEdit.test.ts
//
// Tests for the edit-profile rules and patch.
//
// Tested:
// - usernameProblem, isNameTooLong, profileEditPatch, canSaveProfile
//
// What is covered:
// - the username rules and their order, the name length in code points, the patch of only the changed fields, and when Save is allowed
//
// Run with: pnpm --filter @beatly/mobile test -- profileEdit
//
// SEE: apps/mobile/src/screens/profile/profileEdit.ts

import { describe, expect, it } from "@jest/globals";

import {
  canSaveProfile,
  isNameTooLong,
  profileEditPatch,
  usernameProblem,
} from "../../../src/screens/profile/profileEdit.ts";

const original = { display_name: "Maxi", username: "maxi_23" };

describe("usernameProblem", () => {
  it("is null for the unchanged value, including an unchanged null", () => {
    expect(usernameProblem("maxi_23", "maxi_23")).toBeNull();
    expect(usernameProblem(null, "")).toBeNull();
  });

  it("is required when a set username is emptied", () => {
    expect(usernameProblem("maxi_23", "")).toBe("required");
  });

  it("is invalid for characters outside letters, numbers and underscores", () => {
    expect(usernameProblem("maxi_23", "a b")).toBe("invalid");
    expect(usernameProblem("maxi_23", "maxi!")).toBe("invalid");
  });

  it("is too short under 3 and too long over 30", () => {
    expect(usernameProblem("maxi_23", "ab")).toBe("tooShort");
    expect(usernameProblem("maxi_23", "a".repeat(31))).toBe("tooLong");
  });

  it("is null at exactly 3 and 30 characters and for a mixed-case value", () => {
    expect(usernameProblem("maxi_23", "abc")).toBeNull();
    expect(usernameProblem("maxi_23", "a".repeat(30))).toBeNull();
    expect(usernameProblem("maxi_23", "Max_23")).toBeNull();
  });
});

describe("isNameTooLong", () => {
  it("counts an emoji once and allows 50 code points", () => {
    expect(isNameTooLong("a".repeat(49) + "😀")).toBe(false);
    expect(isNameTooLong("a".repeat(50))).toBe(false);
  });

  it("is true at 51", () => {
    expect(isNameTooLong("a".repeat(51))).toBe(true);
  });
});

describe("profileEditPatch", () => {
  it("is null when nothing changed, including trailing spaces on the name", () => {
    expect(profileEditPatch(original, { name: "Maxi", username: "maxi_23" })).toBeNull();
    expect(profileEditPatch(original, { name: "Maxi  ", username: "maxi_23" })).toBeNull();
  });

  it("sends only the name when only the name changed", () => {
    expect(profileEditPatch(original, { name: "New", username: "maxi_23" })).toEqual({
      display_name: "New",
    });
  });

  it("sends only the username when only the username changed", () => {
    expect(profileEditPatch(original, { name: "Maxi", username: "new_one" })).toEqual({
      username: "new_one",
    });
  });

  it("sends null when the name was emptied or is only spaces", () => {
    expect(profileEditPatch(original, { name: "", username: "maxi_23" })).toEqual({
      display_name: null,
    });
    expect(profileEditPatch(original, { name: "   ", username: "maxi_23" })).toEqual({
      display_name: null,
    });
  });

  it("sends both when both changed", () => {
    expect(profileEditPatch(original, { name: "New", username: "new_one" })).toEqual({
      display_name: "New",
      username: "new_one",
    });
  });
});

describe("canSaveProfile", () => {
  it("is false when unchanged", () => {
    expect(canSaveProfile(original, { name: "Maxi", username: "maxi_23" })).toBe(false);
  });

  it("is false when the username is invalid or the name is too long", () => {
    expect(canSaveProfile(original, { name: "Maxi", username: "ab" })).toBe(false);
    expect(canSaveProfile(original, { name: "a".repeat(51), username: "maxi_23" })).toBe(false);
  });

  it("is true for a valid change", () => {
    expect(canSaveProfile(original, { name: "New", username: "maxi_23" })).toBe(true);
  });
});
