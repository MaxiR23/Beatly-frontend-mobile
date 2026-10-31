// apps/mobile/test/screens/onboarding/OnboardingScreen.test.tsx
//
// Tests for the onboarding flow.
//
// Tested:
// - OnboardingScreen
//
// What is covered:
// - the bottom button: Pick 5 more and disabled, then Continue (5) after five picks (en and es), the 20 limit
// - Continue shows the building step and calls finish with the picked ids in pick order
// - too_few_artists returns to step 1 with the picks kept and the notice shown, a toggle hides it
// - any other failure shows the error with retry, and retry calls finish again with the same ids
// - similar artists: two picks in a row never draw an artist twice, a second pick waits for the first answer, an empty answer adds no row, the rows survive the return from too_few_artists
// - the welcome stays until Get started, which writes the completion into the profile cache
//
// Run with: pnpm --filter @beatly/mobile test -- OnboardingScreen
//
// SEE: apps/mobile/src/screens/onboarding/OnboardingScreen.tsx

import type { OnboardingService, Profile, Success } from "@beatly/core";
import { afterEach, describe, expect, it } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { profileQueryKey } from "../../../src/queries/useProfile.ts";
import { OnboardingScreen } from "../../../src/screens/onboarding/OnboardingScreen.tsx";
import {
  completionFixture,
  makeCore,
  onboardingArtistsFixture,
  profileFixture,
  stateFlag,
  successOf,
  Wrapper,
} from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";
import { createTestQueryClient } from "../../helpers/queryClient.ts";

const en = resources.en;

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const pending: Profile = { ...profileFixture, onboarding_completed_at: null };

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore({ getMyProfile: () => Promise.resolve(successOf(pending)), ...options });
  const queryClient = createTestQueryClient();
  await render(
    <Wrapper core={ctx.core} client={queryClient}>
      <Insets>
        <OnboardingScreen />
      </Insets>
    </Wrapper>,
  );
  await screen.findByText("Onboarding Artist 1");
  return { ctx, queryClient };
}

async function pick(count: number) {
  for (let n = 1; n <= count; n += 1) {
    await fireEvent.press(screen.getByRole("button", { name: `Onboarding Artist ${String(n)}` }));
  }
}

const ids = (count: number) => onboardingArtistsFixture.slice(0, count).map((artist) => artist.id);

describe("OnboardingScreen pick", () => {
  it("reads Pick 5 more and is disabled, then Continue (5) and is enabled after five picks", async () => {
    await setup();
    const more = screen.getByRole("button", { name: "Pick 5 more" });
    expect(stateFlag(more, "disabled")).toBe(true);
    await pick(5);
    const next = screen.getByRole("button", { name: "Continue (5)" });
    expect(stateFlag(next, "disabled")).toBeFalsy();
  });

  it("reads the es label", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(screen.getByRole("button", { name: "Elegí 5 más" })).toBeTruthy();
  });

  it("unpicks a picked artist with a second tap", async () => {
    await setup();
    await pick(2);
    expect(screen.getByRole("button", { name: "Pick 3 more" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 1" }));
    expect(screen.getByRole("button", { name: "Pick 4 more" })).toBeTruthy();
  });
});

describe("OnboardingScreen finish", () => {
  it("Continue shows the building step and calls finish with the picked ids in pick order", async () => {
    const { ctx } = await setup({ finishOnboarding: () => new Promise(() => undefined) });
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 3" }));
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 2" }));
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 5" }));
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 4" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText(en.onboarding.building.title)).toBeTruthy();
    expect(screen.getByText("Finding artists like Onboarding Artist 3")).toBeTruthy();
    expect(ctx.finishOnboarding).toHaveBeenCalledTimes(1);
    expect(ctx.finishOnboarding.mock.calls[0]?.[0]).toEqual([
      "UCo3",
      "UCo1",
      "UCo2",
      "UCo5",
      "UCo4",
    ]);
  });

  it("too_few_artists returns to step 1 with the picks kept and the notice shown", async () => {
    await setup({
      finishOnboarding: () => Promise.resolve({ kind: "api_failure", reason: "too_few_artists" }),
    });
    await pick(5);
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText(en.onboarding.pick.tooFew)).toBeTruthy();
    expect(screen.getAllByTestId("pick-ring")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Continue (5)" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 6" }));
    expect(screen.queryByText(en.onboarding.pick.tooFew)).toBeNull();
  });

  it("any other failure shows the error with retry, and retry calls finish again with the same ids", async () => {
    const { ctx } = await setup({
      finishOnboarding: () => Promise.resolve({ kind: "api_failure", reason: "upstream_timeout" }),
    });
    await pick(5);
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    await waitFor(() => {
      expect(ctx.finishOnboarding).toHaveBeenCalledTimes(2);
    });
    expect(ctx.finishOnboarding.mock.calls[1]?.[0]).toEqual(
      ctx.finishOnboarding.mock.calls[0]?.[0],
    );
    expect(ctx.finishOnboarding.mock.calls[0]?.[0]).toEqual(ids(5));
  });

  it("a transport failure also shows the error with retry", async () => {
    await setup({
      finishOnboarding: () => Promise.resolve({ kind: "transport_failure", cause: "timeout" }),
    });
    await pick(5);
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
  });
});

const pool = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `UCs${String(n)}`,
  name: `Similar ${String(n)}`,
  thumbnail_url: null,
  image: null,
}));

// Behaves as the contract says: the first three of the pool that are not excluded.
const contractSimilar: OnboardingService["similar"] = (_artistId, excludeIds) =>
  Promise.resolve({
    kind: "success",
    data: { artists: pool.filter((artist) => !excludeIds.includes(artist.id)).slice(0, 3) },
    maxAgeSeconds: 0,
  });

describe("OnboardingScreen similar artists", () => {
  it("two picks in a row draw no artist twice", async () => {
    const { ctx } = await setup({ similarArtists: contractSimilar });
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 1" }));
    expect(await screen.findByText("Similar 1")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 2" }));
    expect(await screen.findByText("Similar 4")).toBeTruthy();
    expect(screen.getByText("Similar 5")).toBeTruthy();
    expect(screen.getByText("Similar 6")).toBeTruthy();
    const second = ctx.similarArtists.mock.calls[1];
    expect(second?.[1]).toEqual(expect.arrayContaining(["UCs1", "UCs2", "UCs3"]));
    for (const artist of pool) {
      expect(screen.getAllByText(artist.name)).toHaveLength(1);
    }
  });

  it("a second pick waits for the first answer before asking", async () => {
    let release: () => void = () => undefined;
    let calls = 0;
    const { ctx } = await setup({
      similarArtists: (artistId, excludeIds) => {
        calls += 1;
        if (calls > 1) return contractSimilar(artistId, excludeIds);
        return new Promise((resolve) => {
          release = () => {
            void contractSimilar(artistId, excludeIds).then(resolve);
          };
        });
      },
    });
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 2" }));
    await waitFor(() => {
      expect(ctx.similarArtists).toHaveBeenCalledTimes(1);
    });
    await act(() => {
      release();
      return Promise.resolve();
    });
    await waitFor(() => {
      expect(ctx.similarArtists).toHaveBeenCalledTimes(2);
    });
    expect(ctx.similarArtists.mock.calls[1]?.[1]).toEqual(
      expect.arrayContaining(["UCs1", "UCs2", "UCs3"]),
    );
    expect(await screen.findByText("Similar 4")).toBeTruthy();
    for (const artist of pool) {
      expect(screen.queryAllByText(artist.name).length).toBeLessThanOrEqual(1);
    }
  });

  it("an empty answer adds no row", async () => {
    const { ctx } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 1" }));
    await waitFor(() => {
      expect(ctx.similarArtists).toHaveBeenCalledTimes(1);
    });
    expect(screen.getAllByTestId("pick-row")).toHaveLength(2);
  });

  it("the similar rows survive the return from too_few_artists", async () => {
    const { ctx } = await setup({
      similarArtists: contractSimilar,
      finishOnboarding: () => Promise.resolve({ kind: "api_failure", reason: "too_few_artists" }),
    });
    await fireEvent.press(screen.getByRole("button", { name: "Onboarding Artist 1" }));
    await screen.findByText("Similar 1");
    for (const n of [2, 3, 4, 5]) {
      await fireEvent.press(screen.getByRole("button", { name: `Onboarding Artist ${String(n)}` }));
    }
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText(en.onboarding.pick.tooFew)).toBeTruthy();
    expect(await screen.findByText("Similar 1")).toBeTruthy();
    expect(ctx.similarArtists.mock.calls.filter((call) => call[0] === "UCo1")).toHaveLength(1);
  });
});

describe("OnboardingScreen welcome", () => {
  it("after finish the welcome stays until Get started, which writes the completion into the profile cache", async () => {
    // The first read answers; the refetch after Get started stays pending, so the cache shows what was written.
    let reads = 0;
    const { queryClient } = await setup({
      getMyProfile: () => {
        reads += 1;
        return reads === 1 ? Promise.resolve(successOf(pending)) : new Promise(() => undefined);
      },
    });
    await pick(5);
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText("Welcome, maxi_23!")).toBeTruthy();
    expect(screen.getAllByTestId("welcome-photo")).toHaveLength(5);
    expect(
      queryClient.getQueryData<Success<Profile>>(profileQueryKey)?.data.onboarding_completed_at,
    ).toBeNull();
    await act(() => Promise.resolve());
    expect(screen.getByText("Welcome, maxi_23!")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.onboarding.welcome.start }));
    expect(
      queryClient.getQueryData<Success<Profile>>(profileQueryKey)?.data.onboarding_completed_at,
    ).toBe(completionFixture.onboarding_completed_at);
  });

  it("greets without a name when the profile has none", async () => {
    await setup({
      getMyProfile: () =>
        Promise.resolve(successOf({ ...pending, username: null, display_name: null })),
    });
    await pick(5);
    await fireEvent.press(screen.getByRole("button", { name: "Continue (5)" }));
    expect(await screen.findByText(en.onboarding.welcome.greetingNoName)).toBeTruthy();
  });
});
