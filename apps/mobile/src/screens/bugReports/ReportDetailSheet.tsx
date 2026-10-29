// INFO: one report in full as a sheet for a developer or an admin: description, category, reporter, linked entity and date, its status badge and the button that closes or reopens it, optimistic with a rollback; a forbidden, a missing report or any other failure shows an inline line.
import type { BugReportWithReporter } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { Badge, Button, Sheet, Text } from "@beatly/ui/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useWindowInsets } from "../../providers/WindowInsetsProvider.tsx";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useSetBugReportStatus } from "../../queries/useBugReports.ts";
import { reportDate } from "./reportDate.ts";
import { reporterLabel } from "./reporterLabel.ts";
import { useReduceMotion } from "../player/useReduceMotion.ts";

interface ReportDetailSheetProps {
  visible: boolean;
  onClosed: () => void;
  report: BugReportWithReporter;
  onClose: () => void;
}

function failureReason(error: unknown): string | null {
  return error instanceof OutcomeError && error.outcome.kind === "api_failure"
    ? error.outcome.reason
    : null;
}

export function ReportDetailSheet({ visible, onClosed, report, onClose }: ReportDetailSheetProps) {
  const t = useT("bugReports");
  const reduceMotion = useReduceMotion();
  const tc = useT("common");
  const insets = useWindowInsets();
  const update = useSetBugReportStatus();

  const [confirmed, setConfirmed] = useState(report.status);

  const shown = update.isPending ? update.variables.status : confirmed;
  const date = reportDate(report.created_at);
  const reason = failureReason(update.error);

  return (
    <Sheet
      reduceMotion={reduceMotion}
      visible={visible}
      onClosed={onClosed}
      onClose={onClose}
      closeLabel={t("triage.detail.dismiss")}
      bottomInset={insets.bottom}
      topInset={insets.top}
    >
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Text variant="subtitle">{t("triage.detail.title")}</Text>
          <Badge
            label={t(`list.status.${shown}`)}
            tone={shown === "open" ? "primary" : "tertiary"}
            testID="report-detail-status"
          />
        </View>
        <View style={styles.pair}>
          <Text variant="label" tone="secondary">
            {t("triage.detail.description")}
          </Text>
          <Text variant="body">{report.description}</Text>
        </View>
        <View style={styles.pair}>
          <Text variant="label" tone="secondary">
            {t("triage.detail.category")}
          </Text>
          <Text variant="body">{t(`categories.${report.category}`)}</Text>
        </View>
        <View style={styles.pair}>
          <Text variant="label" tone="secondary">
            {t("triage.detail.reporter")}
          </Text>
          <Text variant="body">{reporterLabel(report.reporter, t)}</Text>
        </View>
        {report.entity_type !== null ? (
          <View style={styles.pair}>
            <Text variant="label" tone="secondary">
              {t("triage.detail.entity")}
            </Text>
            <Text variant="body">
              {[t(`list.entity.${report.entity_type}`), report.entity_id ?? ""].join(
                t("list.metaSeparator"),
              )}
            </Text>
          </View>
        ) : null}
        {date !== null ? (
          <View style={styles.pair}>
            <Text variant="label" tone="secondary">
              {t("triage.detail.date")}
            </Text>
            <Text variant="body">
              {t("list.date", { date, formatParams: { date: { dateStyle: "medium" } } })}
            </Text>
          </View>
        ) : null}
        <Button
          variant="secondary"
          shape="field"
          label={shown === "open" ? t("triage.detail.close") : t("triage.detail.reopen")}
          loading={update.isPending}
          onPress={() => {
            update.mutate(
              { id: report.id, status: shown === "open" ? "closed" : "open" },
              {
                onSuccess: (data) => {
                  setConfirmed(data.status);
                },
              },
            );
          }}
        />
        {update.isError ? (
          <Text variant="meta" tone="error">
            {reason === "forbidden"
              ? t("triage.detail.forbidden")
              : reason === "report_not_found"
                ? t("triage.detail.notFound")
                : tc("error.generic")}
          </Text>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pair: { gap: spacing.xxs },
});
