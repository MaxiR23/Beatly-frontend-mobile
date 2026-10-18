// INFO: the query hooks of GET /bug-reports/me, the caller's own reports, and GET /bug-reports, every report by filter, both paged through the shared infinite-query hook; the mutation of POST /bug-reports, which refetches the caller's reports once the report exists; and the mutation of PATCH /bug-reports/{id}, optimistic across every cached filter with a rollback, which refetches them once settled.
import type {
  BugReport,
  BugReportStatus,
  BugReportWithReporter,
  CreateBugReportInput,
  PageResult,
  Success,
} from "@beatly/core";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { useInfiniteList } from "./useInfiniteList.ts";

export const myBugReportsQueryKey = ["bugReports", "mine"] as const;

export type BugReportFilter = "all" | BugReportStatus;
export const allBugReportsQueryKey = ["bugReports", "all"] as const;
export const allBugReportsFilterKey = (filter: BugReportFilter) =>
  [...allBugReportsQueryKey, filter] as const;

type TriageData = InfiniteData<Success<PageResult<BugReportWithReporter>>, string | null>;

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

export function useAllBugReports(filter: BugReportFilter) {
  const { bugReports } = useCore();
  return useInfiniteList({
    queryKey: allBugReportsFilterKey(filter),
    fetchPage: (cursor) => bugReports.listBugReports(filter === "all" ? null : filter, cursor),
  });
}

export function useSetBugReportStatus() {
  const { bugReports } = useCore();
  const queryClient = useQueryClient();
  return useMutation<
    BugReport,
    Error,
    { id: string; status: BugReportStatus },
    { previous: [QueryKey, TriageData | undefined][] }
  >({
    mutationFn: async ({ id, status }) => {
      const outcome = await bugReports.updateBugReportStatus(id, status);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: allBugReportsQueryKey });
      const previous = queryClient.getQueriesData<TriageData>({ queryKey: allBugReportsQueryKey });
      queryClient.setQueriesData<TriageData>(
        { queryKey: allBugReportsQueryKey },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              data: {
                ...page.data,
                items: page.data.items.map((item) => (item.id === id ? { ...item, status } : item)),
              },
            })),
          },
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: allBugReportsQueryKey }),
  });
}
