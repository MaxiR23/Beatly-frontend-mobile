// INFO: the route of any unknown link; not guarded, it only redirects to /.
import { NotFoundScreen } from "../src/screens/notFound/NotFoundScreen.tsx";

export default function NotFound() {
  return <NotFoundScreen />;
}

export { UnexpectedErrorScreen as ErrorBoundary } from "../src/screens/unexpectedError/UnexpectedErrorScreen.tsx";
