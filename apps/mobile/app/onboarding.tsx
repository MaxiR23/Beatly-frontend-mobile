// INFO: the onboarding route; guarded to a signed-in user whose profile has not completed it.
import { OnboardingScreen } from "../src/screens/onboarding/OnboardingScreen.tsx";

export default function Onboarding() {
  return <OnboardingScreen />;
}

export { UnexpectedErrorScreen as ErrorBoundary } from "../src/screens/unexpectedError/UnexpectedErrorScreen.tsx";
