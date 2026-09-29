// INFO: the shared paginated helper: fetches a page, echoes the opaque cursor, and restarts from the first page on invalid_cursor.
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

export async function fetchPage<T>(
  client: HttpClient,
  options: FetchPageOptions<T>,
): Promise<HttpOutcome<PageResult<T>>> {
  const cursor = options.cursor ?? null;
  const schema = paginatedSchema(options.item);

  async function get(withCursor: string | null): Promise<HttpOutcome<PageResult<T>>> {
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
        items: outcome.data.items,
        page: outcome.data.page,
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
