// INFO: calls a retry once when the connection comes back while the failure on screen had the offline cause (the cause of the render before the connection returned, since a cause derived from the connection changes with it); for the failures that are not queries (the onboarding finish, the email-link confirm), which the query layer does not refetch by itself.
import type { ErrorCause } from "@beatly/ui/native";
import { useEffect, useRef } from "react";

import { useOnline } from "../../queries/useOnline.ts";

export function useRetryOnReconnect(cause: ErrorCause | null, retry: () => void): void {
  const online = useOnline();
  const previous = useRef<{ online: boolean; cause: ErrorCause | null }>({ online, cause });
  useEffect(() => {
    const before = previous.current;
    if (online && !before.online && before.cause === "offline") retry();
    previous.current = { online, cause };
  }, [online, cause, retry]);
}
