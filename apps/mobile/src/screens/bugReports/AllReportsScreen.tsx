// INFO: every bug report for a developer or an admin, newest first as the API sends them, paged, under all, open and closed filters that each start from the first page: each row its category, reporter, date and an excerpt, and an open or closed badge, opening the report in full; loading, an empty list per filter, not allowed and an error with retry are drawn.
import type { BugReportWithReporter } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Badge,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaRow,
  Text,
} from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useAllBugReports, type BugReportFilter } from "../../queries/useBugReports.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";
import { reportDate } from "./reportDate.ts";
import { ReportDetailSheet } from "./ReportDetailSheet.tsx";
import { reporterLabel } from "./reporterLabel.ts";

const filters = ["all", "open", "closed"] as const;

function isForbidden(error: unknown): boolean {
  return (
    error instanceof OutcomeError &&
    error.outcome.kind === "api_failure" &&
    error.outcome.reason === "forbidden"
  );
}

export function AllReportsScreen() {
  const t = useT("bugReports");
  const tc = useT("common");
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const [filter, setFilter] = useState<BugReportFilter>("all");
  const [selected, setSelected] = useState<BugReportWithReporter | null>(null);
  const reports = useAllBugReports(filter);

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const subtitleOf = (report: BugReportWithReporter): string => {
    const parts: string[] = [reporterLabel(report.reporter, t)];
    const date = reportDate(report.created_at);
    if (date !== null) {
      parts.push(t("list.date", { date, formatParams: { date: { dateStyle: "medium" } } }));
    }
    parts.push(report.description);
    return parts.join(t("list.metaSeparator"));
  };

  let body: ReactNode;
  if (isForbidden(reports.error)) {
    body = <EmptyState icon="flag" message={t("triage.forbidden")} />;
  } else if (reports.isPending) {
    body = <LoadingState label={tc("loading")} />;
  } else if (reports.isError) {
    body = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void reports.refetch()}
      />
    );
  } else if (reports.data.length === 0) {
    body = <EmptyState icon="inbox" message={t(`triage.empty.${filter}`)} />;
  } else {
    body = (
      <FlatList
        testID="all-reports-list"
        data={reports.data}
        keyExtractor={(report) => report.id}
        onEndReached={reports.loadMore}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
        renderItem={({ item }) => (
          <MediaRow
            icon="flag"
            size="medium"
            shape="square"
            images={[]}
            title={t(`categories.${item.category}`)}
            subtitle={subtitleOf(item)}
            onPress={() => {
              setSelected(item);
            }}
            trailing={
              <Badge
                label={t(`list.status.${item.status}`)}
                tone={item.status === "open" ? "primary" : "tertiary"}
                testID={`triage-status-${item.id}`}
              />
            }
            testID={`triage-${item.id}`}
          />
        )}
      />
    );
  }

  return (
    <SafeAreaView testID="all-reports" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="back" accessibilityLabel={t("triage.back")} onPress={goBack} />
        <Text variant="title" numberOfLines={1}>
          {t("triage.title")}
        </Text>
      </View>
      <View style={styles.chips}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
        >
          {filters.map((key) => (
            <Chip
              key={key}
              label={t(`triage.filters.${key}`)}
              selected={filter === key}
              onPress={() => {
                setFilter(key);
              }}
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.content}>{body}</View>
      {selected !== null ? (
        <ReportDetailSheet
          report={selected}
          onClose={() => {
            setSelected(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  chips: { marginBottom: spacing.md },
  chipsList: { paddingHorizontal: layout.gutter, gap: spacing.sm },
  content: { flex: 1 },
});
