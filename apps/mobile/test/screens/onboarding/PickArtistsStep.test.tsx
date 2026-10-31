// apps/mobile/test/screens/onboarding/PickArtistsStep.test.tsx
//
// Tests for the onboarding's pick step.
//
// Tested:
// - PickArtistsStep
//
// What is covered:
// - the curated artists in rows of three in the order returned, loading, the generic error with retry, the empty message, the next page at the end of the grid
// - the search after the debounce, picking the found artist, no results, the search error with retry
// - a picked artist selected, its similar artists asked with every id on screen excluded (the search result too), the answered ones drawn after its row as returned, an empty answer adding no row, a failure recorded as failed
// - the too_few_artists notice, the bottom button (disabled with how many are missing, then Continue)
//
// Run with: pnpm --filter @beatly/mobile test -- PickArtistsStep
//
// SEE: apps/mobile/src/screens/onboarding/PickArtistsStep.tsx

import type { HttpOutcome, OnboardingArtist, PageResult, SearchResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import type {
  PickedArtist,
  SimilarAnswer,
} from "../../../src/screens/onboarding/onboardingRules.ts";
import { PickArtistsStep } from "../../../src/screens/onboarding/PickArtistsStep.tsx";
import {
  makeCore,
  onboardingArtistsFixture,
  pageOf,
  searchResultFixture,
  stateFlag,
  tiers,
  Wrapper,
} from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";

const en = resources.en;

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const pickedOf = (artist: OnboardingArtist): PickedArtist => ({
  id: artist.id,
  name: artist.name,
  image: artist.image,
});

interface Props {
  picked?: PickedArtist[];
  expanded?: string[];
  similar?: SimilarAnswer[];
  onSimilar?: (answer: SimilarAnswer) => void;
  tooFew?: boolean;
  onToggle?: (artist: PickedArtist) => void;
  onContinue?: () => void;
}

function stepOf(core: ReturnType<typeof makeCore>["core"], props: Props) {
  return (
    <Wrapper core={core}>
      <Insets>
        <PickArtistsStep
          picked={props.picked ?? []}
          expanded={props.expanded ?? []}
          similar={props.similar ?? []}
          onSimilar={props.onSimilar ?? (() => undefined)}
          tooFew={props.tooFew ?? false}
          onToggle={props.onToggle ?? (() => undefined)}
          onContinue={props.onContinue ?? (() => undefined)}
          reduceMotion
        />
      </Insets>
    </Wrapper>
  );
}

async function setup(options: Parameters<typeof makeCore>[0] = {}, props: Props = {}) {
  const ctx = makeCore(options);
  await render(stepOf(ctx.core, props));
  return ctx;
}

const input = () => screen.getByLabelText(en.onboarding.pick.search);
const failure: HttpOutcome<PageResult<never>> = { kind: "api_failure", reason: "upstream_error" };
const searchOf = (artist: SearchResult["artist"]) => () =>
  Promise.resolve<HttpOutcome<SearchResult>>({
    kind: "success",
    data: { ...searchResultFixture, artist },
    maxAgeSeconds: 0,
  });

describe("PickArtistsStep curated list", () => {
  it("draws the curated artists in rows of three in the order returned", async () => {
    await setup();
    expect(await screen.findByText("Onboarding Artist 1")).toBeTruthy();
    const rows = screen.getAllByTestId("pick-row");
    expect(rows).toHaveLength(2);
    const names = onboardingArtistsFixture.map((artist) => artist.name);
    expect(
      screen.getAllByText(/Onboarding Artist/).map((node) => String(node.props.children)),
    ).toEqual(names);
  });

  it("draws the title, the subtitle and the search field", async () => {
    await setup();
    expect(await screen.findByText(en.onboarding.pick.title)).toBeTruthy();
    expect(screen.getByText(en.onboarding.pick.subtitle)).toBeTruthy();
    expect(input()).toBeTruthy();
  });

  it("draws the loading state while the list loads", async () => {
    await setup({ listOnboardingArtists: () => new Promise(() => undefined) });
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws the generic error and refetches on retry", async () => {
    const ctx = await setup({ listOnboardingArtists: () => Promise.resolve(failure) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    await waitFor(() => {
      expect(ctx.listOnboardingArtists).toHaveBeenCalledTimes(2);
    });
  });

  it("draws the empty message for an empty first page, keeping the search", async () => {
    await setup({ listOnboardingArtists: () => Promise.resolve(pageOf<OnboardingArtist>([])) });
    expect(await screen.findByText(en.onboarding.pick.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
    expect(input()).toBeTruthy();
  });

  it("loads the next page at the end of the grid", async () => {
    const ctx = await setup({
      listOnboardingArtists: (cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf(onboardingArtistsFixture.slice(0, 3), { has_more: true, next_cursor: "c1" })
            : pageOf(onboardingArtistsFixture.slice(3)),
        ),
    });
    await screen.findByText("Onboarding Artist 1");
    await fireEvent(screen.getByTestId("pickGrid"), "endReached");
    await waitFor(() => {
      expect(ctx.listOnboardingArtists).toHaveBeenCalledWith("c1");
    });
    expect(await screen.findByText("Onboarding Artist 6")).toBeTruthy();
  });
});

describe("PickArtistsStep search", () => {
  it("searches the typed text after the debounce and draws the found artist", async () => {
    const ctx = await setup();
    await screen.findByText("Onboarding Artist 1");
    await fireEvent.changeText(input(), "  test  ");
    expect(await screen.findByText("Test Artist")).toBeTruthy();
    expect(ctx.search).toHaveBeenCalledWith("test");
    expect(screen.queryByText("Onboarding Artist 1")).toBeNull();
  });

  it("picks the found artist", async () => {
    const onToggle = jest.fn();
    await setup({}, { onToggle });
    await fireEvent.changeText(input(), "test");
    await fireEvent.press(await screen.findByRole("button", { name: "Test Artist" }));
    expect(onToggle).toHaveBeenCalledWith({
      id: "ar1",
      name: "Test Artist",
      image: tiers("ar1"),
    });
  });

  it("draws the no-results line when the search finds no artist", async () => {
    await setup({ search: searchOf(null) });
    await fireEvent.changeText(input(), "zzz");
    expect(await screen.findByText(en.onboarding.pick.noResults)).toBeTruthy();
  });

  it("draws the search error with retry", async () => {
    const ctx = await setup({
      search: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await fireEvent.changeText(input(), "zzz");
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    await waitFor(() => {
      expect(ctx.search).toHaveBeenCalledTimes(2);
    });
  });

  it("draws the loading state while the search is pending", async () => {
    await setup({ search: () => new Promise(() => undefined) });
    await fireEvent.changeText(input(), "zzz");
    expect(await screen.findByLabelText(en.common.loading)).toBeTruthy();
  });

  it("shows the curated list again once the field is cleared", async () => {
    await setup();
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Artist");
    await fireEvent.press(screen.getByRole("button", { name: en.onboarding.pick.clearSearch }));
    expect(await screen.findByText("Onboarding Artist 1")).toBeTruthy();
  });
});

describe("PickArtistsStep picks", () => {
  const similarArtists = [1, 2, 3].map((n) => ({
    id: `UCs${String(n)}`,
    name: `Similar ${String(n)}`,
    thumbnail_url: null,
    image: null,
  }));
  const first = onboardingArtistsFixture[0];
  if (first === undefined) throw new Error("fixture");
  const answered = (artists: PickedArtist[]): SimilarAnswer => ({
    id: first.id,
    kind: "artists",
    artists,
  });

  it("asks the similar artists of a picked artist with every id on screen excluded", async () => {
    const onSimilar = jest.fn();
    const ctx = await setup(
      {
        similarArtists: () =>
          Promise.resolve({ kind: "success", data: { artists: similarArtists }, maxAgeSeconds: 0 }),
      },
      { picked: [pickedOf(first)], expanded: [first.id], onSimilar },
    );
    await waitFor(() => {
      expect(onSimilar).toHaveBeenCalledTimes(1);
    });
    expect(ctx.similarArtists).toHaveBeenCalledTimes(1);
    expect(ctx.similarArtists).toHaveBeenCalledWith(
      first.id,
      onboardingArtistsFixture.map((artist) => artist.id),
    );
    expect(onSimilar).toHaveBeenCalledWith({
      id: first.id,
      kind: "artists",
      artists: similarArtists.map((artist) => ({ id: artist.id, name: artist.name, image: null })),
    });
  });

  it("waits for the curated list and excludes the search result too, once", async () => {
    let release: () => void = () => undefined;
    const ctx = await setup(
      {
        listOnboardingArtists: () =>
          new Promise((resolve) => {
            release = () => {
              resolve(pageOf<OnboardingArtist>(onboardingArtistsFixture));
            };
          }),
      },
      { picked: [pickedOf(first)], expanded: [first.id] },
    );
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Artist");
    expect(ctx.similarArtists).not.toHaveBeenCalled();
    await act(() => {
      release();
      return Promise.resolve();
    });
    await waitFor(() => {
      expect(ctx.similarArtists).toHaveBeenCalledTimes(1);
    });
    expect(ctx.similarArtists).toHaveBeenCalledWith(first.id, [
      ...onboardingArtistsFixture.map((artist) => artist.id),
      "ar1",
    ]);
  });

  it("draws the answered similar artists after the picked artist's row, as returned", async () => {
    const ctx = await setup(
      {},
      {
        picked: [pickedOf(first)],
        expanded: [first.id],
        similar: [answered(similarArtists.map((a) => ({ id: a.id, name: a.name, image: null })))],
      },
    );
    expect(await screen.findByText("Similar 1")).toBeTruthy();
    expect(screen.getByText("Similar 2")).toBeTruthy();
    expect(screen.getByText("Similar 3")).toBeTruthy();
    expect(screen.getAllByTestId("pick-row")).toHaveLength(3);
    expect(screen.getAllByTestId("pick-ring")).toHaveLength(1);
    expect(stateFlag(screen.getByRole("button", { name: first.name }), "selected")).toBe(true);
    expect(ctx.similarArtists).not.toHaveBeenCalled();
  });

  it("adds no row for an empty answer", async () => {
    await setup({}, { picked: [pickedOf(first)], expanded: [first.id], similar: [answered([])] });
    await screen.findByText("Onboarding Artist 1");
    expect(screen.getAllByTestId("pick-row")).toHaveLength(2);
  });

  it("records a failure as a failed answer and adds no row", async () => {
    const onSimilar = jest.fn();
    const ctx = await setup(
      { similarArtists: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }) },
      { picked: [pickedOf(first)], expanded: [first.id], onSimilar },
    );
    await waitFor(() => {
      expect(onSimilar).toHaveBeenCalledWith({ id: first.id, kind: "failed" });
    });
    expect(screen.getAllByTestId("pick-row")).toHaveLength(2);
    const props: Props = {
      picked: [pickedOf(first)],
      expanded: [first.id],
      onSimilar,
      similar: [{ id: first.id, kind: "failed" }],
    };
    await screen.rerender(stepOf(ctx.core, props));
    expect(screen.getAllByTestId("pick-row")).toHaveLength(2);
    expect(ctx.similarArtists).toHaveBeenCalledTimes(1);
  });

  it("disables the unpicked tiles at twenty", async () => {
    const twenty = Array.from({ length: 20 }, (_, index) => ({
      id: `UCx${String(index)}`,
      name: `Picked ${String(index)}`,
      image: null,
    }));
    await setup({}, { picked: twenty });
    await screen.findByText("Onboarding Artist 1");
    expect(stateFlag(screen.getByRole("button", { name: "Onboarding Artist 1" }), "disabled")).toBe(
      true,
    );
  });
});

describe("PickArtistsStep notice and button", () => {
  it("shows the too-few notice only when asked", async () => {
    await setup({}, { tooFew: true });
    expect(await screen.findByText(en.onboarding.pick.tooFew)).toBeTruthy();
  });

  it("does not show the notice by default", async () => {
    await setup();
    await screen.findByText("Onboarding Artist 1");
    expect(screen.queryByText(en.onboarding.pick.tooFew)).toBeNull();
  });

  it("reads how many are missing and is disabled below five", async () => {
    const some = onboardingArtistsFixture.slice(0, 2).map(pickedOf);
    await setup({}, { picked: some });
    const button = await screen.findByRole("button", { name: "Pick 3 more" });
    expect(stateFlag(button, "disabled")).toBe(true);
  });

  it("continues with the count from five", async () => {
    const onContinue = jest.fn();
    const five = onboardingArtistsFixture.slice(0, 5).map(pickedOf);
    await setup({}, { picked: five, onContinue });
    const button = await screen.findByRole("button", { name: "Continue (5)" });
    expect(stateFlag(button, "disabled")).toBeFalsy();
    await fireEvent.press(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(await screen.findByText(resources.es.onboarding.pick.title)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Elegí 5 más" })).toBeTruthy();
  });
});
