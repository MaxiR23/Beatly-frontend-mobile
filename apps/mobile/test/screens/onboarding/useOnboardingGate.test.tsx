// apps/mobile/test/screens/onboarding/useOnboardingGate.test.tsx
//
// Tests for the onboarding route gate.
//
// Tested:
// - gateOf, useOnboardingGate
//
// What is covered:
// - gateOf: unknown, signed out, the mark pending, the mark true (home with no profile, a null profile, a failed profile), the profile deciding, failed, onboarding and home, a failed refetch with data cached
// - the hook, path "stored as done": the mark stored for this account opens home and GET /profile/me is never read
// - the hook, path "not stored": another account's mark waits for the profile; a profile with a timestamp stores the mark; a pending onboarding does not
//
// Run with: pnpm --filter @beatly/mobile test -- useOnboardingGate
//
// SEE: apps/mobile/src/screens/onboarding/useOnboardingGate.ts

import { ONBOARDING_MARK_KEY } from "@beatly/core";
import type { Profile } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { SessionProvider } from "../../../src/providers/SessionProvider.tsx";
import { gateOf, useOnboardingGate } from "../../../src/screens/onboarding/useOnboardingGate.ts";
import {
  makeCore,
  memoryStorage,
  profileFixture,
  successOf,
  Wrapper,
} from "../../helpers/core.tsx";

const done: Profile = profileFixture;
const notDone: Profile = { ...profileFixture, onboarding_completed_at: null };
const noMark = { data: false, isError: false };
const noProfile = { data: undefined, isError: false };

describe("gateOf", () => {
  it("is deciding while the session is unknown", () => {
    expect(gateOf("unknown", noMark, noProfile)).toBe("deciding");
  });

  it("is signed_out when signed out", () => {
    expect(gateOf("signed_out", noMark, noProfile)).toBe("signed_out");
  });

  it("is deciding while the mark is read", () => {
    expect(gateOf("signed_in", { data: undefined, isError: false }, noProfile)).toBe("deciding");
  });

  it("is home with the mark stored, with no profile, a pending profile or a failed read", () => {
    const mark = { data: true, isError: false };
    expect(gateOf("signed_in", mark, noProfile)).toBe("home");
    expect(gateOf("signed_in", mark, { data: notDone, isError: false })).toBe("home");
    expect(gateOf("signed_in", mark, { data: undefined, isError: true })).toBe("home");
  });

  it("is deciding while the profile is read", () => {
    expect(gateOf("signed_in", noMark, noProfile)).toBe("deciding");
  });

  it("is failed when the profile read failed with nothing cached", () => {
    expect(gateOf("signed_in", noMark, { data: undefined, isError: true })).toBe("failed");
  });

  it("is onboarding when the profile has no completion", () => {
    expect(gateOf("signed_in", noMark, { data: notDone, isError: false })).toBe("onboarding");
  });

  it("is home when the profile has a completion", () => {
    expect(gateOf("signed_in", noMark, { data: done, isError: false })).toBe("home");
  });

  it("reads the profile when the mark is unreadable", () => {
    const broken = { data: undefined, isError: true };
    expect(gateOf("signed_in", broken, { data: notDone, isError: false })).toBe("onboarding");
    expect(gateOf("signed_in", broken, noProfile)).toBe("deciding");
  });

  it("keeps home when a refetch fails with data cached", () => {
    expect(gateOf("signed_in", noMark, { data: done, isError: true })).toBe("home");
    expect(gateOf("signed_in", noMark, { data: notDone, isError: true })).toBe("onboarding");
  });
});

function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={ctx.core}>
      <SessionProvider>{children}</SessionProvider>
    </Wrapper>
  );
  return { ctx, wrapper };
}

describe("useOnboardingGate with the mark stored for this account", () => {
  it("is home and getMyProfile is never called", async () => {
    const { ctx, wrapper } = setup({
      storage: memoryStorage({ [ONBOARDING_MARK_KEY]: "user-1" }),
      getMyProfile: () => new Promise(() => undefined),
    });
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(result.current.gate).toBe("home");
    });
    await act(() => Promise.resolve());
    expect(ctx.getMyProfile).not.toHaveBeenCalled();
  });

  it("is home even when the profile cannot be read", async () => {
    const { ctx, wrapper } = setup({
      storage: memoryStorage({ [ONBOARDING_MARK_KEY]: "user-1" }),
      getMyProfile: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(result.current.gate).toBe("home");
    });
    expect(ctx.getMyProfile).not.toHaveBeenCalled();
  });
});

describe("useOnboardingGate with the mark not stored", () => {
  it("with another account's mark, waits for the profile", async () => {
    let answer: (profile: Profile) => void = () => undefined;
    const { ctx, wrapper } = setup({
      storage: memoryStorage({ [ONBOARDING_MARK_KEY]: "user-2" }),
      getMyProfile: () =>
        new Promise((resolve) => {
          answer = (profile) => {
            resolve(successOf(profile));
          };
        }),
    });
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    expect(result.current.gate).toBe("deciding");
    await act(async () => {
      answer(notDone);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.gate).toBe("onboarding");
    });
    expect(await ctx.storage.get(ONBOARDING_MARK_KEY)).toBe("user-2");
  });

  it("stores the mark when the profile reads a timestamp", async () => {
    const storage = memoryStorage();
    const set = jest.spyOn(storage, "set");
    const { wrapper } = setup({ storage });
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(result.current.gate).toBe("home");
    });
    await waitFor(() => {
      expect(set).toHaveBeenCalledWith(ONBOARDING_MARK_KEY, "user-1");
    });
  });

  it("does not store the mark while the profile is pending onboarding", async () => {
    const { ctx, wrapper } = setup({ getMyProfile: () => Promise.resolve(successOf(notDone)) });
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(result.current.gate).toBe("onboarding");
    });
    await act(() => Promise.resolve());
    expect(await ctx.storage.get(ONBOARDING_MARK_KEY)).toBeNull();
  });

  it("is failed when the profile read fails, and retry reads it again", async () => {
    let reads = 0;
    const { ctx, wrapper } = setup({
      getMyProfile: () => {
        reads += 1;
        return Promise.resolve(
          reads === 1 ? { kind: "api_failure", reason: "upstream_error" } : successOf(notDone),
        );
      },
    });
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(result.current.gate).toBe("failed");
    });
    await act(async () => {
      result.current.retry();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.gate).toBe("onboarding");
    });
    expect(ctx.getMyProfile).toHaveBeenCalledTimes(2);
  });

  it("is signed_out without a session", async () => {
    const { ctx, wrapper } = setup();
    ctx.auth.getStatus.mockImplementation(() => Promise.resolve("signed_out"));
    const { result } = await renderHook(() => useOnboardingGate(), { wrapper });
    await waitFor(() => {
      expect(result.current.gate).toBe("signed_out");
    });
    expect(ctx.getMyProfile).not.toHaveBeenCalled();
  });
});
