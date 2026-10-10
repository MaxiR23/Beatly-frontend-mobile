// INFO: the bug reports service: sending a report, with the entity it is about when there is one, and the caller's own reports, a page at a time, over the shared paginated helper.
import {
  bugReportSchema,
  type BugReport,
  type BugReportCategory,
  type BugReportEntityType,
} from "../domain/bugReport.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";

export interface CreateBugReportInput {
  readonly category: BugReportCategory;
  readonly description: string;
  // Both halves of the backend's entity pair, or none: the type makes "only one" unrepresentable.
  readonly entity?: { readonly type: BugReportEntityType; readonly id: string };
}

export interface BugReportsService {
  createBugReport(input: CreateBugReportInput): Promise<HttpOutcome<BugReport>>;
  listMyBugReports(cursor: string | null): Promise<HttpOutcome<PageResult<BugReport>>>;
}

export function createBugReportsService(client: HttpClient): BugReportsService {
  return {
    createBugReport: ({ category, description, entity }) =>
      client.request({
        method: "POST",
        path: "/bug-reports",
        body: {
          category,
          description,
          ...(entity !== undefined ? { entity_type: entity.type, entity_id: entity.id } : {}),
        },
        schema: bugReportSchema,
      }),
    listMyBugReports: (cursor) =>
      fetchPage(client, { path: "/bug-reports/me", item: bugReportSchema, cursor }),
  };
}
