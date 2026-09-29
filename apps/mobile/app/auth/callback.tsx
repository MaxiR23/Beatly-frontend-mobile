// INFO: the email link callback route; not guarded, since the link opens it before a session exists.
import { AuthCallbackScreen } from "../../src/screens/authCallback/AuthCallbackScreen.tsx";

export default function AuthCallback() {
  return <AuthCallbackScreen />;
}
