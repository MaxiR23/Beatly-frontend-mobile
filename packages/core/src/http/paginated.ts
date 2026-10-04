// INFO: the shared paginated helper: fetches a page, echoes the opaque cursor, restarts from the first page on invalid_cursor, and returns the fields a route fixes on the first page of a read.
import type { z } from "zod";

import { paginatedSchema, type PageBlock } from "../domain/envelope.ts";
import type { HttpClient, QueryParams } from "./client.ts";
import type { HttpOutcome } from "./outcome.ts";

export interface PageResult<T> {
  readonly items: T[];
  readonly page: PageBlock;
  // true when a stale cursor was dropped and this is the first page again;
  // the infinite-query hook resets its pages on it.
  readonly restartedFromFirstPage: boolean;
}

export interface FetchPageOptions<T> {
  readonly path: string;
  readonly item: z.ZodType<T>;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly query?: QueryParams;
}

async function fetchPageOf<T, D extends { items: T[]; page: PageBlock }>(
  client: HttpClient,
  options: FetchPageOptions<T>,
  schema: z.ZodType<D>,
): Promise<HttpOutcome<D & { readonly restartedFromFirstPage: boolean }>> {
  const cursor = options.cursor ?? null;

  async function get(
    withCursor: string | null,
  ): Promise<HttpOutcome<D & { readonly restartedFromFirstPage: boolean }>> {
    const outcome = await client.request({
      path: options.path,
      query: {
        ...options.query,
        ...(withCursor !== null ? { cursor: withCursor } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
      },
      schema,
    });
    if (outcome.kind !== "success") return outcome;
    return {
      kind: "success",
      maxAgeSeconds: outcome.maxAgeSeconds,
      data: {
        ...outcome.data,
        restartedFromFirstPage: withCursor === null && cursor !== null,
      },
    };
  }

  const first = await get(cursor);
  if (cursor !== null && first.kind === "api_failure" && first.reason === "invalid_cursor") {
    return get(null);
  }
  return first;
}

export function fetchPage<T>(
  client: HttpClient,
  options: FetchPageOptions<T>,
): Promise<HttpOutcome<PageResult<T>>> {
  return fetchPageOf(client, options, paginatedSchema(options.item));
}

// For a route whose data carries fields beside items and page, fixed on the first page of a read.
export function fetchPageWith<T, X extends object>(
  client: HttpClient,
  options: FetchPageOptions<T>,
  extra: z.ZodType<X>,
): Promise<HttpOutcome<PageResult<T> & X>> {
  return fetchPageOf(client, options, paginatedSchema(options.item).and(extra));
}
