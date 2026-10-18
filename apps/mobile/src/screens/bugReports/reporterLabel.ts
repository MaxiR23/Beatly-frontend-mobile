// INFO: the name a report's reporter is drawn with: the display name, else @username, else the translated unknown-user text.
import type { BugReporter } from "@beatly/core";

import type { useT } from "../../adapters/i18n.ts";

export function reporterLabel(
  reporter: BugReporter,
  t: ReturnType<typeof useT<"bugReports">>,
): string {
  if (reporter.display_name !== null) return reporter.display_name;
  if (reporter.username !== null) return t("triage.username", { username: reporter.username });
  return t("triage.unknownReporter");
}
