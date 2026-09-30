// INFO: counts this player opening once on mount and says whether the sheet handle nudges; local data, a mutation like the recent searches writes; a storage failure draws no nudge (the service logs it).
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export function useSheetNudge(): boolean {
  const { sheetNudge } = useCore();
  const { mutate, data } = useMutation({
    mutationFn: async () => {
      const outcome = await sheetNudge.take();
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
  });
  useEffect(() => {
    mutate();
  }, [mutate]);
  return data === true;
}
