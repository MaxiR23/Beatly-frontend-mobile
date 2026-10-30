// INFO: step 1 of the onboarding: the curated artists in rows of three with a search field that finds one artist, a ring, a check and a pop on the picked ones, a row of each picked artist's similar artists after its row (POST /onboarding/similar, asked one pick at a time with every id on screen excluded; none returned or a failure adds no row), a notice when an artist is no longer available, and a fixed bottom button over a fade that reads how many are missing and then continues.
import { MAX_ONBOARDING_ARTISTS, type OnboardingArtist } from "@beatly/core";
import { color, layout, spacing } from "@beatly/ui";
import {
  Button,
  EmptyState,
  ErrorState,
  GradientFill,
  LoadingState,
  Notice,
  PickGrid,
  SearchBar,
  Text,
  type PickRow,
} from "@beatly/ui/native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useOnboardingArtists, useSimilarArtists } from "../../queries/useOnboarding.ts";
import { useSearch } from "../../queries/useSearch.ts";
import { SEARCH_DEBOUNCE_MS } from "../search/SearchScreen.tsx";
import { useDebouncedValue } from "../search/useDebouncedValue.ts";
import {
  nextSimilarRequest,
  pickButton,
  similarExcludeIds,
  type PickedArtist,
  type SimilarAnswer,
} from "./onboardingRules.ts";
import { pickRows } from "./pickRows.ts";

interface PickArtistsStepProps {
  readonly picked: readonly PickedArtist[];
  readonly expanded: readonly string[];
  readonly similar: readonly SimilarAnswer[];
  readonly tooFew: boolean;
  readonly onSimilar: (answer: SimilarAnswer) => void;
  readonly onToggle: (artist: PickedArtist) => void;
  readonly onContinue: () => void;
  readonly reduceMotion: boolean;
}

const toPicked = (artist: OnboardingArtist): PickedArtist => ({
  id: artist.id,
  name: artist.name,
  image: artist.image,
});

export function PickArtistsStep({
  picked,
  expanded,
  similar,
  tooFew,
  onSimilar,
  onToggle,
  onContinue,
  reduceMotion,
}: PickArtistsStepProps) {
  const t = useT("onboarding");
  const tc = useT("common");
  const insets = useSafeAreaInsets();
  const artists = useOnboardingArtists();
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const active = trimmed === "" ? "" : debounced;
  const search = useSearch(active);
  const searching = trimmed !== "";
  const { mutate } = useSimilarArtists();
  const asking = useRef<string | null>(null);

  const found = searching ? (search.data?.artist ?? null) : null;
  // The curated artists are on screen too: ask only once they are loaded, so the exclusion is complete.
  const curatedLoaded = artists.isSuccess;
  const next = nextSimilarRequest(expanded, similar);
  const excludeIds = similarExcludeIds({
    curated: artists.data ?? [],
    found,
    picked,
    answers: similar,
  });

  // One request at a time, in pick order: the next one is built after the previous answer is on screen, so two picks in a row never repeat an artist.
  useEffect(() => {
    if (!curatedLoaded || next === null || asking.current === next) return;
    asking.current = next;
    mutate(
      { artistId: next, excludeIds },
      {
        onSuccess: (artistsFound) => {
          onSimilar({ id: next, kind: "artists", artists: artistsFound.map(toPicked) });
        },
        onError: () => {
          onSimilar({ id: next, kind: "failed" });
        },
      },
    );
  }, [curatedLoaded, next, excludeIds, mutate, onSimilar]);

  const base: readonly PickedArtist[] = searching
    ? found
      ? [{ id: found.id, name: found.name, image: found.image }]
      : []
    : (artists.data ?? []).map((artist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.image,
      }));

  const pickedIds = new Set(picked.map((artist) => artist.id));
  const full = picked.length >= MAX_ONBOARDING_ARTISTS;
  const rows: PickRow[] = pickRows(base, new Set(expanded), (id) => {
    const answer = similar.find((item) => item.id === id);
    return answer?.kind === "artists" ? answer.artists : undefined;
  }).map((row) => ({
    key: row.key,
    fadeIn: row.related,
    tiles: row.artists.map((artist) => ({
      key: artist.id,
      name: artist.name,
      image: artist.image,
      selected: pickedIds.has(artist.id),
      disabled: full,
      onPress: () => {
        onToggle(artist);
      },
    })),
  }));

  let empty;
  if (searching) {
    if (search.isPending) {
      empty = <LoadingState label={tc("loading")} />;
    } else if (search.isError) {
      empty = (
        <ErrorState
          message={tc("error.generic")}
          retryLabel={tc("retry")}
          onRetry={() => void search.refetch()}
        />
      );
    } else {
      empty = <EmptyState icon="search" message={t("pick.noResults")} />;
    }
  } else if (artists.isPending) {
    empty = <LoadingState label={tc("loading")} />;
  } else if (artists.isError) {
    empty = (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void artists.refetch()}
      />
    );
  } else {
    empty = <EmptyState icon="user" message={t("pick.empty")} />;
  }

  const header = (
    <View style={styles.header}>
      <Text variant="display">{t("pick.title")}</Text>
      <Text tone="secondary">{t("pick.subtitle")}</Text>
      <SearchBar
        value={text}
        onChangeText={setText}
        placeholder={t("pick.search")}
        accessibilityLabel={t("pick.search")}
        clearLabel={t("pick.clearSearch")}
        onSubmit={() => undefined}
      />
      {tooFew ? <Notice tone="error" message={t("pick.tooFew")} /> : null}
    </View>
  );

  const button = pickButton(picked.length);

  return (
    <View style={styles.screen}>
      <PickGrid
        testID="pickGrid"
        rows={rows}
        header={header}
        empty={empty}
        bottomPadding={layout.controlHeight + spacing.xxl + layout.gutter + insets.bottom}
        onEndReached={() => {
          if (!searching) artists.loadMore();
        }}
        reduceMotion={reduceMotion}
      />
      <View
        style={[styles.bar, { paddingBottom: insets.bottom + layout.gutter }]}
        pointerEvents="box-none"
      >
        <GradientFill direction="vertical" colors={[color.overlay.clear, color.surface.base]} />
        {button.kind === "more" ? (
          <Button
            variant="primary"
            label={t("pick.more", { n: button.n })}
            disabled
            onPress={() => undefined}
          />
        ) : (
          <Button
            variant="primary"
            label={t("pick.continue", { n: button.n })}
            onPress={onContinue}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: spacing.md, paddingBottom: spacing.lg },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xxl,
  },
});
