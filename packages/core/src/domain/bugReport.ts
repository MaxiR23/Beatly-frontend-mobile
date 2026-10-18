// INFO: a bug report as POST /bug-reports and PATCH /bug-reports/{id} return it and as GET /bug-reports/me lists it, and GET /bug-reports with its reporter: a category, a description, the entity it is about (both halves or neither), an open or closed status and its timestamps.
import { z } from "zod";

export const bugReportCategorySchema = z.enum(["playback", "loading", "ui", "crash", "other"]);
export const bugReportEntityTypeSchema = z.enum(["track", "album", "artist", "playlist"]);
export const bugReportStatusSchema = z.enum(["open", "closed"]);

export const bugReportSchema = z.object({
  id: z.string(),
  reporter_id: z.string(),
  category: bugReportCategorySchema,
  description: z.string(),
  entity_type: bugReportEntityTypeSchema.nullable(),
  entity_id: z.string().nullable(),
  status: bugReportStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const bugReporterSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),
});

// GET /bug-reports only: the profile of whoever filed the report; both names null when it is not visible.
export const bugReportWithReporterSchema = bugReportSchema.extend({ reporter: bugReporterSchema });

export type BugReporter = z.infer<typeof bugReporterSchema>;
export type BugReportWithReporter = z.infer<typeof bugReportWithReporterSchema>;
export type BugReport = z.infer<typeof bugReportSchema>;
export type BugReportCategory = z.infer<typeof bugReportCategorySchema>;
export type BugReportEntityType = z.infer<typeof bugReportEntityTypeSchema>;
export type BugReportStatus = z.infer<typeof bugReportStatusSchema>;

// The order the form draws the categories in.
export const BUG_REPORT_CATEGORIES = bugReportCategorySchema.options;
