// INFO: the report form as a sheet: a category among the five and a description, sent to POST /bug-reports with the track attached when it comes from the track menu; Send is disabled until both are valid; it confirms inside the sheet and closes on success, and stays open with an inline error and the input kept on failure.
import { BUG_REPORT_CATEGORIES, type BugReportCategory } from "@beatly/core";
import { motion, spacing } from "@beatly/ui";
import { Button, Chip, Input, Notice, Sheet, Text } from "@beatly/ui/native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useCreateBugReport } from "../../queries/useBugReports.ts";
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_DESCRIPTION_MIN_LENGTH,
  canSendReport,
  descriptionLength,
  descriptionProblem,
  showsCounter,
} from "./reportRules.ts";

interface ReportProblemSheetProps {
  // The track the report is about, from the track menu; null from the account sheet.
  track: { id: string; title: string } | null;
  onClose: () => void;
}

export function ReportProblemSheet({ track, onClose }: ReportProblemSheetProps) {
  const t = useT("bugReports");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const create = useCreateBugReport();
  const [category, setCategory] = useState<BugReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(onClose, motion.duration.notice);
    return () => {
      clearTimeout(timer);
    };
  }, [sent, onClose]);

  const submit = () => {
    if (create.isPending || category === null || !canSendReport(category, description)) return;
    create.mutate(
      {
        category,
        description: description.trim(),
        ...(track !== null ? { entity: { type: "track", id: track.id } } : {}),
      },
      {
        onSuccess: () => {
          setSent(true);
        },
      },
    );
  };

  const problem = descriptionProblem(description);
  let error: string | undefined;
  if (problem === "tooShort") error = t("form.tooShort", { min: REPORT_DESCRIPTION_MIN_LENGTH });
  if (problem === "tooLong") error = t("form.tooLong", { max: REPORT_DESCRIPTION_MAX_LENGTH });

  return (
    <Sheet
      visible
      onClose={onClose}
      closeLabel={t("form.close")}
      bottomInset={insets.bottom}
      topInset={insets.top}
    >
      {sent ? (
        <Notice tone="success" message={t("form.sent")} />
      ) : (
        <View style={styles.form}>
          <Text variant="subtitle">{t("form.title")}</Text>
          {track !== null ? (
            <Text variant="meta" tone="secondary" numberOfLines={1}>
              {t("form.about", { title: track.title })}
            </Text>
          ) : null}
          <View style={styles.field}>
            <Text variant="label" tone="secondary">
              {t("form.category")}
            </Text>
            <View style={styles.chips}>
              {BUG_REPORT_CATEGORIES.map((value) => (
                <Chip
                  key={value}
                  label={t(`categories.${value}`)}
                  selected={category === value}
                  onPress={() => {
                    setCategory(value);
                  }}
                />
              ))}
            </View>
          </View>
          <Input
            label={t("form.description")}
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
            multiline
            {...(error !== undefined ? { error } : {})}
          />
          {showsCounter(description) ? (
            <Text variant="meta" tone={problem === "tooLong" ? "error" : "secondary"}>
              {t("form.counter", {
                length: descriptionLength(description),
                max: REPORT_DESCRIPTION_MAX_LENGTH,
              })}
            </Text>
          ) : null}
          {create.isError ? (
            <Text variant="meta" tone="error">
              {tc("error.generic")}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                variant="secondary"
                shape="field"
                label={t("form.cancel")}
                onPress={onClose}
              />
            </View>
            <View style={styles.action}>
              <Button
                variant="primary"
                shape="field"
                label={t("form.send")}
                loading={create.isPending}
                disabled={!canSendReport(category, description)}
                onPress={submit}
              />
            </View>
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.md },
  action: { flex: 1 },
});
