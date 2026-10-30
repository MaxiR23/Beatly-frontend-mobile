// apps/mobile/test/screens/onboarding/WelcomeStep.test.tsx
//
// Tests for the onboarding's welcome step.
//
// Tested:
// - WelcomeStep
//
// What is covered:
// - the photos given, in pick order
// - the greeting by name (en and es) and without a name
// - the text and Get started, which calls onStart
//
// Run with: pnpm --filter @beatly/mobile test -- WelcomeStep
//
// SEE: apps/mobile/src/screens/onboarding/WelcomeStep.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import type { PickedArtist } from "../../../src/screens/onboarding/onboardingRules.ts";
import { WelcomeStep } from "../../../src/screens/onboarding/WelcomeStep.tsx";
import { tiers } from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";

const en = resources.en;

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const artist = (n: number): PickedArtist => ({
  id: `UC${String(n)}`,
  name: `Artist ${String(n)}`,
  image: tiers(`w${String(n)}`),
});

function draw(
  patch: { artists?: PickedArtist[]; name?: string | null; onStart?: () => void } = {},
) {
  return render(
    <Insets>
      <WelcomeStep
        artists={patch.artists ?? [artist(1), artist(2)]}
        name={patch.name === undefined ? "Maxi" : patch.name}
        onStart={patch.onStart ?? (() => undefined)}
        reduceMotion
      />
    </Insets>,
  );
}

describe("WelcomeStep", () => {
  it("draws the photos it is given in pick order", async () => {
    await draw({ artists: [artist(3), artist(1), artist(2), artist(4), artist(5)] });
    const covers = screen.getAllByTestId("cover-single");
    expect(covers).toHaveLength(5);
    expect(covers[0]?.props.source).toEqual([{ uri: "test://img/w3/m" }]);
    expect(covers[1]?.props.source).toEqual([{ uri: "test://img/w1/m" }]);
  });

  it("greets the user by name", async () => {
    await draw();
    expect(screen.getByText("Welcome, Maxi!")).toBeTruthy();
  });

  it("greets in es", async () => {
    await i18n.changeLanguage("es");
    await draw();
    expect(screen.getByText("¡Bienvenido, Maxi!")).toBeTruthy();
    expect(screen.getByText(resources.es.onboarding.welcome.start)).toBeTruthy();
  });

  it("greets without a name when the profile has none", async () => {
    await draw({ name: null });
    expect(screen.getByText(en.onboarding.welcome.greetingNoName)).toBeTruthy();
  });

  it("draws the text and Get started, which calls onStart", async () => {
    const onStart = jest.fn();
    await draw({ onStart });
    expect(screen.getByText(en.onboarding.welcome.text)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.onboarding.welcome.start }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
