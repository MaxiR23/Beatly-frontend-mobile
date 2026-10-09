// INFO: the report form's rules, shown as the user types; they mirror POST /bug-reports (a category, a description of 5 to 2000 characters).
import type { BugReportCategory } from "@beatly/core";

export const REPORT_DESCRIPTION_MIN_LENGTH = 5;
export const REPORT_DESCRIPTION_MAX_LENGTH = 2000;
// The counter appears from here on, near the limit.
export const REPORT_COUNTER_FROM_LENGTH = 1800;

// The backend's length counts code points; string.length counts UTF-16 units, so an emoji would count twice.
export function descriptionLength(text: string): number {
  return Array.from(text.trim()).length;
}

// Nothing while the field is empty: the user has not written yet.
export function descriptionProblem(text: string): "tooShort" | "tooLong" | null {
  const length = descriptionLength(text);
  if (length === 0) return null;
  if (length < REPORT_DESCRIPTION_MIN_LENGTH) return "tooShort";
  if (length > REPORT_DESCRIPTION_MAX_LENGTH) return "tooLong";
  return null;
}

export function showsCounter(text: string): boolean {
  return descriptionLength(text) >= REPORT_COUNTER_FROM_LENGTH;
}

export function canSendReport(category: BugReportCategory | null, text: string): boolean {
  const length = descriptionLength(text);
  return (
    category !== null &&
    length >= REPORT_DESCRIPTION_MIN_LENGTH &&
    length <= REPORT_DESCRIPTION_MAX_LENGTH
  );
}
