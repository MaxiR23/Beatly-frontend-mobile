// apps/mobile/test/screens/profile/EditProfileSheet.test.tsx
//
// Tests for the edit-profile sheet.
//
// Tested:
// - EditProfileSheet
//
// What is covered:
// - the prefilled form with Save disabled, the validation messages, only the changed field sent, a cleared name as null
// - the busy state, a taken username under its field, the generic error for any other failure, the input kept
// - closing once the profile refetched
//
// Run with: pnpm --filter @beatly/mobile test -- EditProfileSheet
//
// SEE: apps/mobile/src/screens/profile/EditProfileSheet.tsx

import type { HttpOutcome, Profile } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useProfile } from "../../../src/queries/useProfile.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { EditProfileSheet } from "../../../src/screens/profile/EditProfileSheet.tsx";
import { makeCore, profileFixture, stateFlag, successOf, Wrapper } from "../../helpers/core.tsx";

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// Holds the profile query the way the header avatar does, so a save has a reader to refetch.
function ProfileReader() {
  useProfile();
  return null;
}

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  const onClose = jest.fn();
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ProfileReader />
        <EditProfileSheet profile={profileFixture} onClose={onClose} />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return { ...ctx, onClose };
}

const save = () => screen.getByRole("button", { name: en.profile.edit.submit });
const nameInput = () => screen.getByLabelText(en.profile.edit.name);
const usernameInput = () => screen.getByLabelText(en.profile.edit.username);

function failure(reason: string): () => Promise<HttpOutcome<Profile>> {
  return () => Promise.resolve({ kind: "api_failure", reason });
}

describe("EditProfileSheet", () => {
  it("prefills the name and the username and disables Save while nothing changed", async () => {
    await setup();
    expect(nameInput().props.value).toBe("Maxi");
    expect(usernameInput().props.value).toBe("maxi_23");
    expect(stateFlag(save(), "disabled")).toBe(true);
  });

  it("shows the validation messages as the user types", async () => {
    await setup();
    await fireEvent.changeText(usernameInput(), "ab");
    expect(screen.getByText(en.profile.edit.usernameTooShort.replace("{{min}}", "3"))).toBeTruthy();
    expect(stateFlag(save(), "disabled")).toBe(true);
    await fireEvent.changeText(usernameInput(), "a b");
    expect(screen.getByText(en.profile.edit.usernameInvalid)).toBeTruthy();
    expect(stateFlag(save(), "disabled")).toBe(true);
    await fireEvent.changeText(usernameInput(), "");
    expect(screen.getByText(en.profile.edit.usernameRequired)).toBeTruthy();
    expect(stateFlag(save(), "disabled")).toBe(true);
    await fireEvent.changeText(usernameInput(), "maxi_23");
    await fireEvent.changeText(nameInput(), "a".repeat(51));
    expect(screen.getByText(en.profile.edit.nameTooLong.replace("{{max}}", "50"))).toBeTruthy();
    expect(stateFlag(save(), "disabled")).toBe(true);
  });

  it("sends only the changed field", async () => {
    const ctx = await setup();
    await fireEvent.changeText(nameInput(), "New");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(ctx.updateMyProfile).toHaveBeenCalledTimes(1);
    });
    expect(ctx.updateMyProfile).toHaveBeenCalledWith({ display_name: "New" });
  });

  it("clears the name with null", async () => {
    const ctx = await setup();
    await fireEvent.changeText(nameInput(), "");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(ctx.updateMyProfile).toHaveBeenCalledWith({ display_name: null });
    });
  });

  it("shows the busy state while saving", async () => {
    await setup({ updateMyProfile: () => new Promise(() => undefined) });
    await fireEvent.changeText(nameInput(), "New");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(stateFlag(save(), "busy")).toBe(true);
    });
  });

  it("shows the taken username under the field and keeps the sheet open with the text", async () => {
    const ctx = await setup({ updateMyProfile: failure("username_taken") });
    await fireEvent.changeText(usernameInput(), "taken_one");
    await fireEvent.press(save());
    expect(await screen.findByText(en.profile.edit.usernameTaken)).toBeTruthy();
    expect(usernameInput().props.value).toBe("taken_one");
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
    expect(ctx.onClose).not.toHaveBeenCalled();
    await fireEvent.changeText(usernameInput(), "taken_two");
    expect(screen.queryByText(en.profile.edit.usernameTaken)).toBeNull();
  });

  it("shows the generic error for an api failure and keeps the text", async () => {
    const ctx = await setup({ updateMyProfile: failure("upstream_error") });
    await fireEvent.changeText(nameInput(), "New");
    await fireEvent.press(save());
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(nameInput().props.value).toBe("New");
    expect(ctx.onClose).not.toHaveBeenCalled();
  });

  it("shows the generic error for a transport failure and keeps the text", async () => {
    await setup({
      updateMyProfile: () => Promise.resolve({ kind: "transport_failure", cause: "network" }),
    });
    await fireEvent.changeText(nameInput(), "New");
    await fireEvent.press(save());
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(nameInput().props.value).toBe("New");
  });

  it("closes after the profile refetched", async () => {
    const ctx = await setup({
      updateMyProfile: () => Promise.resolve(successOf({ ...profileFixture, display_name: "New" })),
    });
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    await fireEvent.changeText(nameInput(), "New");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(ctx.onClose).toHaveBeenCalledTimes(1);
    });
    expect(ctx.getMyProfile).toHaveBeenCalledTimes(2);
  });
});
