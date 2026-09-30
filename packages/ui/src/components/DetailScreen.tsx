// INFO: the base of every detail screen (album, playlist, artist): floating
// back and optional more buttons fixed over a hero with a cover over a wash,
// and a title. Four bodies: loading skeleton, error with retry, unavailable,
// ready. The cover is a mosaic, an image, an accent tile or the placeholder;
// the ready body is a list: the hero, the title and the children on top,
// optional rows under them paged by onEndReached. It draws statically:
// nothing moves with the scroll.
import type { ReactNode } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { DetailSkeleton } from "./DetailSkeleton.tsx";
import { EmptyState } from "./EmptyState.tsx";
import { ErrorState } from "./ErrorState.tsx";
import { GlassSurface } from "./GlassSurface.tsx";
import { GradientFill } from "./GradientFill.tsx";
import type { IconName } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";
import { Text } from "./Text.tsx";

export interface DetailRow {
  key: string;
  element: ReactNode;
}

export type DetailBody =
  | { kind: "loading"; label: string }
  | { kind: "error"; message: string; retryLabel: string; onRetry: () => void }
  | { kind: "unavailable"; message: string }
  | {
      kind: "ready";
      title: string;
      cover: { urls: readonly string[]; icon?: IconName | undefined };
      washColor: string | null;
      children: ReactNode;
      rows?: readonly DetailRow[];
      onEndReached?: (() => void) | undefined;
    };

interface DetailScreenProps {
  body: DetailBody;
  backLabel: string;
  onBack: () => void;
  more?: { label: string; onPress: () => void };
  topInset: number;
  // The space the content leaves at its bottom; the screen passes floatingTabBarClearance.
  bottomInset: number;
  testID?: string;
}

export function DetailScreen({
  body,
  backLabel,
  onBack,
  more,
  topInset,
  bottomInset,
  testID,
}: DetailScreenProps) {
  const buttonsPosition = { top: topInset + spacing.xs };
  const belowButtons = { paddingTop: topInset + layout.controlHeight };

  return (
    <View style={styles.root} testID={testID}>
      {body.kind === "loading" ? (
        <View style={styles.fill}>
          <DetailSkeleton label={body.label} topInset={topInset} />
        </View>
      ) : null}
      {body.kind === "error" ? (
        <View style={[styles.fill, belowButtons]}>
          <ErrorState message={body.message} retryLabel={body.retryLabel} onRetry={body.onRetry} />
        </View>
      ) : null}
      {body.kind === "unavailable" ? (
        <View style={[styles.fill, belowButtons]}>
          <EmptyState icon="music" message={body.message} />
        </View>
      ) : null}
      {body.kind === "ready" ? (
        <FlatList
          testID={testID ? `${testID}-list` : undefined}
          data={body.rows ?? []}
          keyExtractor={(row) => row.key}
          renderItem={({ item }) => <>{item.element}</>}
          onEndReached={body.onEndReached}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          ListHeaderComponent={
            <>
              <View
                style={[styles.hero, { paddingTop: topInset + layout.controlHeight + spacing.sm }]}
              >
                {body.washColor === null ? (
                  <View style={styles.washNeutral} testID="detail-wash-neutral" />
                ) : (
                  <View style={styles.wash} testID="detail-wash-color">
                    <GradientFill
                      direction="vertical"
                      colors={[body.washColor, color.surface.base]}
                    />
                  </View>
                )}
                <View style={styles.cover}>
                  <Cover
                    urls={body.cover.urls}
                    icon={body.cover.icon}
                    shape="square"
                    size={layout.heroCover}
                  />
                </View>
              </View>
              <View style={styles.title}>
                <Text variant="title">{body.title}</Text>
              </View>
              {body.children}
            </>
          }
        />
      ) : null}
      <View style={[styles.buttons, buttonsPosition]} pointerEvents="box-none">
        <View style={styles.buttonsRow} pointerEvents="box-none">
          <GlassSurface variant="circle">
            <IconButton icon="chevronLeft" accessibilityLabel={backLabel} onPress={onBack} />
          </GlassSurface>
          {more ? (
            <GlassSurface variant="circle">
              <IconButton icon="ellipsis" accessibilityLabel={more.label} onPress={more.onPress} />
            </GlassSurface>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.base },
  fill: { flex: 1 },
  hero: { alignItems: "center", paddingBottom: spacing.xl },
  washNeutral: StyleSheet.absoluteFill,
  wash: StyleSheet.absoluteFill,
  cover: { ...shadow.cover },
  title: { paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  buttons: { position: "absolute", left: layout.gutter, right: layout.gutter },
  buttonsRow: { flexDirection: "row", justifyContent: "space-between" },
});
