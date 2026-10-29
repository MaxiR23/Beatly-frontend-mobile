// INFO: the screen an unknown link lands on: it draws nothing and sends the user to /, so the session gate picks the landing and the splash stays up while the status is unknown (the router's built-in not-found hides the splash on mount).
import { Redirect } from "expo-router";

export function NotFoundScreen() {
  return <Redirect href="/" />;
}
