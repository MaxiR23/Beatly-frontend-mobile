// INFO: the query hook of GET /bug-reports/me, the caller's own reports, paged through the shared infinite-query hook, and the mutation of POST /bug-reports, which refetches them once the report exists.
import type { CreateBugReportInput } from "@beatly/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { useInfiniteList } from "./useInfiniteList.ts";

export const myBugReportsQueryKey = ["bugReports", "mine"] as const;

export function useMyBugReports() {
  const { bugReports } = useCore();
  return useInfiniteList({
    queryKey: myBugReportsQueryKey,
    fetchPage: (cursor) => bugReports.listMyBugReports(cursor),
  });
}

export function useCreateBugReport() {
  const { bugReports } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBugReportInput) => {
      const outcome = await bugReports.createBugReport(input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myBugReportsQueryKey }),
  });
}
