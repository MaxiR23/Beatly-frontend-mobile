// apps/mobile/test/helpers/queryClient.ts
//
// Test helper: the only way to build a QueryClient in a test.
//
// Tested:
// - Not a test itself; used by the query, provider, screen and route tests
//
// What is covered:
// - The app factory's options with gcTime Infinity, so no garbage collection timer stays open
//
// Run with: pnpm --filter @beatly/mobile test
//
// SEE: apps/mobile/src/queries/queryClient.ts

import type { QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "../../src/queries/queryClient.ts";

export function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, gcTime: Infinity },
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });
  return client;
}
