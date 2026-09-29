// INFO: the app's single QueryClient factory. staleTime comes from the max-age of the response (a core success outcome), never from a literal. A failed query is not retried: the error state has its own retry, and each attempt can cost the full client timeout.
import { DEFAULT_MAX_AGE_SECONDS } from "@beatly/core";
import { QueryClient } from "@tanstack/react-query";

const MS_PER_SECOND = 1000;

export function staleTimeFor(data: unknown): number {
  if (
    typeof data === "object" &&
    data !== null &&
    "maxAgeSeconds" in data &&
    typeof data.maxAgeSeconds === "number"
  ) {
    return data.maxAgeSeconds * MS_PER_SECOND;
  }
  return DEFAULT_MAX_AGE_SECONDS * MS_PER_SECOND;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: (query) => staleTimeFor(query.state.data), retry: false },
    },
  });
}
