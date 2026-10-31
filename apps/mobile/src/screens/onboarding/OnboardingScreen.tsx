// INFO: the onboarding: owns the step (pick, building, welcome), the ordered selection that survives the return from step 2, the too_few_artists notice and the finish mutation; "Get started" writes the completion into the profile cache and the route gate opens home or the kept link.
import { profileName } from "@beatly/core";
import { color } from "@beatly/ui";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFinishOnboarding, useMarkOnboarded } from "../../queries/useOnboarding.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useProfile } from "../../queries/useProfile.ts";
import { useReduceMotion } from "../player/useReduceMotion.ts";
import { BuildingHomeStep } from "./BuildingHomeStep.tsx";
import {
  togglePick,
  WELCOME_PHOTOS,
  type PickedArtist,
  type SimilarAnswer,
} from "./onboardingRules.ts";
import { PickArtistsStep } from "./PickArtistsStep.tsx";
import { WelcomeStep } from "./WelcomeStep.tsx";

type Step = "pick" | "building" | "welcome";

function isTooFewArtists(error: unknown): boolean {
  return (
    error instanceof OutcomeError &&
    error.outcome.kind === "api_failure" &&
    error.outcome.reason === "too_few_artists"
  );
}

export function OnboardingScreen() {
  const reduceMotion = useReduceMotion();
  // Read once here: no step mounts its own profile reader, so a refetch cannot skip the welcome.
  const profile = useProfile();
  const finish = useFinishOnboarding();
  const markOnboarded = useMarkOnboarded();
  const [step, setStep] = useState<Step>("pick");
  const [picked, setPicked] = useState<readonly PickedArtist[]>([]);
  // Every artist picked in this run: their similar rows stay even when unpicked.
  const [expanded, setExpanded] = useState<readonly string[]>([]);
  // The answers of POST /onboarding/similar, one per asked artist, kept across the return from step 2.
  const [similar, setSimilar] = useState<readonly SimilarAnswer[]>([]);
  const [tooFew, setTooFew] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const toggle = (artist: PickedArtist) => {
    setTooFew(false);
    const next = togglePick(picked, artist);
    setPicked(next);
    if (next.length > picked.length) {
      setExpanded((current) => (current.includes(artist.id) ? current : [...current, artist.id]));
    }
  };

  const answerSimilar = (answer: SimilarAnswer) => {
    setSimilar((current) =>
      current.some((item) => item.id === answer.id) ? current : [...current, answer],
    );
  };

  const send = () => {
    finish.mutate(
      picked.map((artist) => artist.id),
      {
        onSuccess: (data) => {
          setCompletedAt(data.onboarding_completed_at);
          setStep("welcome");
        },
        onError: (error) => {
          if (isTooFewArtists(error)) {
            setTooFew(true);
            setStep("pick");
            finish.reset();
          }
        },
      },
    );
  };

  const next = () => {
    setTooFew(false);
    setStep("building");
    send();
  };

  const start = () => {
    if (completedAt !== null) markOnboarded(completedAt);
  };

  return (
    <SafeAreaView testID="onboarding" style={styles.screen} edges={["top", "left", "right"]}>
      {step === "pick" ? (
        <PickArtistsStep
          picked={picked}
          expanded={expanded}
          similar={similar}
          onSimilar={answerSimilar}
          tooFew={tooFew}
          onToggle={toggle}
          onContinue={next}
          reduceMotion={reduceMotion}
        />
      ) : step === "building" ? (
        <BuildingHomeStep
          artistName={picked[0]?.name ?? ""}
          failed={finish.isError && !isTooFewArtists(finish.error)}
          onRetry={send}
          reduceMotion={reduceMotion}
        />
      ) : (
        <WelcomeStep
          artists={picked.slice(0, WELCOME_PHOTOS)}
          name={profile.data ? profileName(profile.data) : null}
          onStart={start}
          reduceMotion={reduceMotion}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
});
