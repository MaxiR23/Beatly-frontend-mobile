// INFO: the credits of a track as a sheet, from GET /tracks/{id}/credits: the performers, writers, producers, metadata provider and the other sections, each with its localized title and names; sections with no names are left out, none left draws the empty state, and loading and a failure with retry are drawn.
import type { CreditSection, PlayableTrack } from "@beatly/core";
import { spacing } from "@beatly/ui";
import { EmptyState, ErrorState, LoadingState, Sheet, Text } from "@beatly/ui/native";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useCredits } from "../../queries/useTracks.ts";

interface CreditsSheetProps {
  track: PlayableTrack;
  onClose: () => void;
}

export function CreditsSheet({ track, onClose }: CreditsSheetProps) {
  const t = useT("trackMenu");
  const insets = useSafeAreaInsets();
  return (
    <Sheet
      visible
      onClose={onClose}
      closeLabel={t("close")}
      bottomInset={insets.bottom}
      topInset={insets.top}
    >
      <CreditsBody trackId={track.trackId} />
    </Sheet>
  );
}

function CreditsBody({ trackId }: { trackId: string }) {
  const t = useT("trackMenu");
  const tc = useT("common");
  const tp = useT("player");
  const credits = useCredits(trackId);

  if (credits.isPending) return <LoadingState label={tc("loading")} />;
  if (credits.isError) {
    return (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void credits.refetch()}
      />
    );
  }
  const { performed_by, written_by, produced_by, music_metadata_provided_by, other_sections } =
    credits.data;
  const sections = [
    performed_by,
    written_by,
    produced_by,
    music_metadata_provided_by,
    ...other_sections,
  ].filter((section): section is CreditSection => section !== null && section.names.length > 0);

  if (sections.length === 0) {
    return <EmptyState icon="info" message={t("credits.empty")} />;
  }
  return (
    <View style={styles.body} testID="track-credits">
      <Text variant="subtitle">{t("credits.title")}</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.sections}>
        {sections.map((section, index) => (
          <View key={`${String(index)}:${section.localized_title}`} style={styles.section}>
            <Text variant="rowTitle">{section.localized_title}</Text>
            <Text tone="secondary">{section.names.join(tp("artistSeparator"))}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, gap: spacing.lg },
  list: { flexShrink: 1 },
  sections: { gap: spacing.lg },
  section: { gap: spacing.xxs },
});
