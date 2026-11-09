// INFO: the single reader of the device's connection in the app: TanStack Query's onlineManager, so the strip and the query pausing can never disagree.
import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

export function useOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
}
