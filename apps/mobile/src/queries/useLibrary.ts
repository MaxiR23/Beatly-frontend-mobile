// INFO: the query hook of GET /library, the caller's unified library, paged through the shared infinite-query hook; the saved state of one album or playlist (GET /library/{kind}/{external_id}), with its cache time from the outcome's max-age via the QueryClient; and the mutation that saves or removes it, optimistic with a rollback, which refetches the library and the saved state once settled; a failure is logged.
import type { LibraryItemInput, LibraryItemKind, LibrarySavedState, Success } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { useInfiniteList } from "./useInfiniteList.ts";

export const libraryQueryKey = ["library"] as const;

export const librarySavedQueryKey = (kind: LibraryItemKind, externalId: string) =>
  ["library", "saved", kind, externalId] as const;

export function useLibrary() {
  const { library } = useCore();
  return useInfiniteList({
    queryKey: libraryQueryKey,
    fetchPage: (cursor) => library.listLibrary(cursor),
  });
}

export function useLibrarySaved(kind: LibraryItemKind, externalId: string, enabled: boolean) {
  const { library } = useCore();
  return useQuery({
    queryKey: librarySavedQueryKey(kind, externalId),
    enabled: enabled && externalId !== "",
    queryFn: async () => {
      const outcome = await library.getSavedState(kind, externalId);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data.saved,
  });
}

export function useSetSaved(kind: LibraryItemKind, externalId: string) {
  const { library, log } = useCore();
  const queryClient = useQueryClient();
  const savedKey = librarySavedQueryKey(kind, externalId);
  return useMutation<
    null,
    Error,
    { saved: boolean; input: LibraryItemInput },
    { previous: Success<LibrarySavedState> | undefined }
  >({
    mutationFn: async ({ saved, input }) => {
      if (saved) {
        const outcome = await library.saveItem(input);
        if (outcome.kind !== "success") throw new OutcomeError(outcome);
        return null;
      }
      const outcome = await library.removeItem(kind, externalId);
      // Already not saved: the state the user asked for.
      if (outcome.kind === "api_failure" && outcome.reason === "library_item_not_found")
        return null;
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return null;
    },
    onMutate: async ({ saved }) => {
      await queryClient.cancelQueries({ queryKey: savedKey });
      const previous = queryClient.getQueryData<Success<LibrarySavedState>>(savedKey);
      if (previous !== undefined) {
        queryClient.setQueryData<Success<LibrarySavedState>>(savedKey, {
          ...previous,
          data: { saved },
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Success<LibrarySavedState>>(savedKey, context.previous);
      }
      log.warn("library.save_failed", {
        kind,
        detail: error instanceof OutcomeError ? error.message : "unknown",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryQueryKey }),
  });
}
