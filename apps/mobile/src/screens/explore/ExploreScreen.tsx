// INFO: the explore tab: the genres in the order the API sends them, each opening its genre screen.
import { color, layout, spacing } from "@beatly/ui";
import {
  EmptyState,
  ErrorState,
  GenreRow,
  LoadingState,
  Text,
  border,
  floatingTabBarClearance,
} from "@beatly/ui/native";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useGenres } from "../../queries/useGenres.ts";
import { AccountButton } from "../account/AccountButton.tsx";

export function ExploreScreen() {
  const t = useT("explore");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const genres = useGenres();

  const clearance = { paddingBottom: floatingTabBarClearance(insets.bottom) };

  let body;
  if (genres.isPending) {
    body = (
      <View style={[styles.state, clearance]}>
        <LoadingState label={tc("loading")} />
      </View>
    );
  } else if (genres.isError) {
    body = (
      <View style={[styles.state, clearance]}>
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => void genres.refetch()}
        />
      </View>
    );
  } else if (genres.data.length === 0) {
    body = (
      <View style={[styles.state, clearance]}>
        <EmptyState icon="compass" message={t("empty")} />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={genres.data}
        keyExtractor={(genre) => genre.slug}
        contentContainerStyle={clearance}
        renderItem={({ item }) => (
          <View style={styles.divider}>
            <GenreRow
              slug={item.slug}
              name={item.name}
              onPress={() => {
                router.push({
                  pathname: "/explore/genres/[slug]",
                  params: { slug: item.slug, name: item.name },
                });
              }}
            />
          </View>
        )}
      />
    );
  }

  return (
    <SafeAreaView testID="explore" edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Text variant="title">{t("title")}</Text>
        <AccountButton />
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface.base },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  state: { flex: 1 },
  divider: { borderBottomWidth: border.hairline, borderBottomColor: color.surface.border },
});
