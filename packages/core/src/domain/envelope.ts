// INFO: the response envelope schema; every route schema is wrapped in it (ADR 006).
import { z } from "zod";

// A reason is any snake_case identifier: the backend may emit reasons its contract does not list.
export const apiReasonSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);
export type ApiReason = z.infer<typeof apiReasonSchema>;

export function envelopeSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), reason: apiReasonSchema }),
  ]);
}

export const pageBlockSchema = z.object({
  limit: z.number().int(),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
  total: z.number().int().nullable(),
});
export type PageBlock = z.infer<typeof pageBlockSchema>;

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), page: pageBlockSchema });
}
