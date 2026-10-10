// INFO: the caller's own reports as a sheet, newest first as the API sends them, paged: each row its category, its date, what it is about and an excerpt, and an open or closed badge; loading, the empty list and an error with retry are drawn.
import type { BugReport } from "@beatly/core";
import { spacing } from "@beatly/ui";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  MediaRow,
  Sheet,
  Text,
} from "@beatly/ui/native";
import type { ReactNode } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useMyBugReports } from "../../queries/useBugReports.ts";
import { reportDate } from "./reportDate.ts";

interface MyReportsSheetProps {
  onClose: () => void;
}

export function MyReportsSheet({ onClose }: MyReportsSheetProps) {
  const t = useT("bugReports");
  const insets = useSafeAreaInsets();
  return (
    <Sheet
      visible
      onClose={onClose}
      closeLabel={t("list.close")}
      bottomInset={insets.bottom}
      topInset={insets.top}
    >
      <ReportsBody />
    </Sheet>
  );
}

function ReportsBody() {
  const t = useT("bugReports");
  const tc = useT("common");
  const reports = useMyBugReports();

  const subtitleOf = (report: BugReport): string => {
    const parts: string[] = [];
    const date = reportDate(report.created_at);
    if (date !== null) {
      parts.push(t("list.date", { date, formatParams: { date: { dateStyle: "medium" } } }));
    }
    if (report.entity_type !== null) parts.push(t(`list.entity.${report.entity_type}`));
    parts.push(report.description);
    return parts.join(t("list.metaSeparator"));
  };

  let list: ReactNode;
  if (reports.isPending) {
    list = <LoadingState label={tc("loading")} />;
  } else if (reports.isError) {
    list = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void reports.refetch()}
      />
    );
  } else if (reports.data.length === 0) {
    list = <EmptyState icon="inbox" message={t("list.empty")} />;
  } else {
    list = (
      <FlatList
        style={styles.list}
        testID="reports-list"
        data={reports.data}
        keyExtractor={(report) => report.id}
        onEndReached={reports.loadMore}
        renderItem={({ item }) => (
          <MediaRow
            icon="flag"
            size="medium"
            shape="square"
            urls={[]}
            title={t(`categories.${item.category}`)}
            subtitle={subtitleOf(item)}
            trailing={
              <Badge
                label={t(`list.status.${item.status}`)}
                tone={item.status === "open" ? "primary" : "tertiary"}
                testID={`report-status-${item.id}`}
              />
            }
            testID={`report-${item.id}`}
          />
        )}
      />
    );
  }

  return (
    <View style={styles.body}>
      <Text variant="subtitle">{t("list.title")}</Text>
      {list}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: spacing.md },
  list: { flexShrink: 1 },
});
