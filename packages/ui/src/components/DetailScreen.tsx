// INFO: the base of every detail screen (album, playlist, artist): floating
// back and optional more buttons over a hero and a title. The hero is
// either a centered cover over a wash or a full-width image with the title
// over it. Four bodies: loading skeleton, error with retry, unavailable,
// ready. The cover is a mosaic, an image, an accent tile or the placeholder;
// the ready body is a list: the hero, the title and the children on top,
// optional rows under them paged by onEndReached two screens before the end, with skeleton rows under them while the next page loads. In the ready body the scroll drives, on the native driver, the cover's shrink to motion.detailCollapse.coverScale and fade, the floating buttons' fade, the title's fade and a top bar's fade in, over ranges derived from the measured hero and title heights; the floating buttons or the bar take touches, never both, on Android; on iOS the floating back never fades and always takes touches, drawn above a strip with no back of its own, reaching from the top edge to spacing.sm past spacing.xs under the back's bottom edge (topInset + spacing.xs + layout.controlHeight + spacing.xs + spacing.sm), with no background: the dominant color (the base surface without one) and a light base-surface shade over it, both fading to transparent at its bottom edge, and only the floating more and the bar's more hand the touches over; under reduce motion the cover does not scale.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { collapsePhase, collapseRanges, type CollapsePhase } from "./detailCollapse.ts";
import { DetailSkeleton, SkeletonRow } from "./DetailSkeleton.tsx";
import { EmptyState } from "./EmptyState.tsx";
import { ErrorState } from "./ErrorState.tsx";
import { GlassSurface } from "./GlassSurface.tsx";
import { GradientFill } from "./GradientFill.tsx";
import type { IconName } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";
import { Text } from "./Text.tsx";

// How far from the end, in visible lengths, the list asks for its next page: two screens before it.
const END_REACHED_THRESHOLD = 2;

export interface DetailRow {
  key: string;
  element: ReactNode;
}

export type DetailBody =
  | { kind: "loading"; label: string; hero?: "cover" | "image" | undefined }
  | { kind: "error"; message: string; retryLabel: string; onRetry: () => void }
  | { kind: "unavailable"; message: string }
  | {
      kind: "ready";
      hero?: "cover" | "image" | undefined;
      title: string;
      cover: { urls: readonly string[]; icon?: IconName | undefined };
      washColor: string | null;
      children: ReactNode;
      rows?: readonly DetailRow[];
      onEndReached?: (() => void) | undefined;
      // Present while the next page loads: skeleton rows under the rows, announced by the label.
      loadingMore?: { label: string } | undefined;
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
  reduceMotion: boolean;
}

export function DetailScreen({
  body,
  backLabel,
  onBack,
  more,
  topInset,
  bottomInset,
  testID,
  reduceMotion,
}: DetailScreenProps) {
  const { height: windowHeight } = useWindowDimensions();
  const heroMaxHeight = { maxHeight: windowHeight * layout.heroImageMaxHeightShare };
  const buttonsPosition = { top: topInset + spacing.xs };
  const belowButtons = { paddingTop: topInset + layout.controlHeight };

  const [scrollY] = useState(() => new Animated.Value(0));
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  const [titleHeight, setTitleHeight] = useState<number | null>(null);
  const [phase, setPhase] = useState<CollapsePhase>("expanded");
  const phaseRef = useRef<CollapsePhase>("expanded");
  const lastOffset = useRef(0);

  const ranges =
    body.kind === "ready"
      ? collapseRanges({ hero: body.hero ?? "cover", heroHeight, titleHeight, topInset })
      : null;
  const latest = useRef(ranges);

  useEffect(() => {
    latest.current = ranges;
    const next = collapsePhase(lastOffset.current, ranges);
    if (next !== phaseRef.current) {
      phaseRef.current = next;
      setPhase(next);
    }
  });

  const [onScroll] = useState(() =>
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        lastOffset.current = y;
        const next = collapsePhase(y, latest.current);
        if (next !== phaseRef.current) {
          phaseRef.current = next;
          setPhase(next);
        }
      },
    }),
  );

  useEffect(() => {
    if (body.kind === "ready") return;
    scrollY.setValue(0);
    lastOffset.current = 0;
    phaseRef.current = "expanded";
    setPhase("expanded");
    setHeroHeight(null);
    setTitleHeight(null);
  }, [body.kind, scrollY]);

  const clamp = { extrapolate: "clamp" } as const;
  const coverOpacity = ranges
    ? scrollY.interpolate({ inputRange: [...ranges.cover], outputRange: [1, 0], ...clamp })
    : null;
  const coverScale =
    ranges && !reduceMotion
      ? scrollY.interpolate({
          inputRange: [...ranges.cover],
          outputRange: [1, motion.detailCollapse.coverScale],
          ...clamp,
        })
      : null;
  const buttonsOpacity = ranges
    ? scrollY.interpolate({ inputRange: [...ranges.buttons], outputRange: [1, 0], ...clamp })
    : null;
  const titleOpacity = ranges
    ? scrollY.interpolate({ inputRange: [...ranges.title], outputRange: [1, 0], ...clamp })
    : null;
  const barOpacity = ranges
    ? scrollY.interpolate({ inputRange: [...ranges.bar], outputRange: [0, 1], ...clamp })
    : null;
  const floatingActive = ranges === null || phase === "expanded";
  const barActive = ranges !== null && phase === "collapsed";
  // On iOS the floating back stays fixed over a gradient strip; only the floating more follows the phase.
  const ios = Platform.OS === "ios";
  const floatingContainerActive = ios || floatingActive;
  // On iOS the strip ends spacing.xs under the back plus spacing.sm of fade, so the button sits inside it; the row shares the button's vertical center.
  const barHeight = ios
    ? topInset + spacing.xs + layout.controlHeight + spacing.xs + spacing.sm
    : topInset + layout.controlHeight;
  const barPaddingTop = ios ? topInset + spacing.xs : topInset;

  const measureHero = (event: LayoutChangeEvent) => {
    setHeroHeight(event.nativeEvent.layout.height);
  };
  const measureTitle = (event: LayoutChangeEvent) => {
    setTitleHeight(event.nativeEvent.layout.height);
  };

  return (
    <View style={styles.root} testID={testID}>
      {body.kind === "loading" ? (
        <View style={styles.fill}>
          <DetailSkeleton label={body.label} topInset={topInset} hero={body.hero} />
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
        <Animated.FlatList
          testID={testID ? `${testID}-list` : undefined}
          data={body.rows ?? []}
          keyExtractor={(row) => row.key}
          renderItem={({ item }) => <>{item.element}</>}
          onEndReached={body.onEndReached}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          ListFooterComponent={
            body.loadingMore ? (
              <View
                style={styles.loadingMore}
                accessibilityRole="progressbar"
                accessibilityLabel={body.loadingMore.label}
                testID={testID ? `${testID}-loading-more` : "detail-loading-more"}
              >
                {Array.from({ length: layout.skeletonRows }, (_, row) => (
                  <SkeletonRow key={row} />
                ))}
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: bottomInset }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <>
              {body.hero === "image" ? (
                <View
                  style={[styles.imageHero, heroMaxHeight]}
                  testID="detail-hero-image"
                  onLayout={measureHero}
                >
                  {body.cover.urls[0] !== undefined ? (
                    <Image
                      source={{ uri: body.cover.urls[0] }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      accessible={false}
                      testID="detail-hero-photo"
                    />
                  ) : null}
                  <View style={styles.fade} testID="detail-hero-fade">
                    <GradientFill
                      direction="vertical"
                      colors={[color.overlay.clear, color.overlay.clear, color.surface.base]}
                    />
                  </View>
                  <Animated.View
                    style={[styles.imageTitle, titleOpacity ? { opacity: titleOpacity } : null]}
                    testID="detail-hero-title"
                  >
                    <Text variant="display" numberOfLines={2}>
                      {body.title}
                    </Text>
                  </Animated.View>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      styles.hero,
                      { paddingTop: topInset + layout.controlHeight + spacing.sm },
                    ]}
                    testID="detail-hero"
                    onLayout={measureHero}
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
                    <Animated.View
                      testID="detail-hero-cover"
                      style={
                        coverOpacity
                          ? {
                              opacity: coverOpacity,
                              ...(coverScale ? { transform: [{ scale: coverScale }] } : {}),
                            }
                          : null
                      }
                    >
                      <Cover
                        urls={body.cover.urls}
                        icon={body.cover.icon}
                        shape="square"
                        size={layout.heroCover}
                        elevated
                      />
                    </Animated.View>
                  </View>
                  <Animated.View
                    style={[styles.title, titleOpacity ? { opacity: titleOpacity } : null]}
                    testID="detail-title"
                    onLayout={measureTitle}
                  >
                    <Text variant="title">{body.title}</Text>
                  </Animated.View>
                </>
              )}
              {body.children}
            </>
          }
        />
      ) : null}
      {body.kind === "ready" ? (
        <Animated.View
          testID="detail-top-bar"
          style={[
            styles.bar,
            {
              height: barHeight,
              paddingTop: barPaddingTop,
              ...(ios ? {} : { backgroundColor: body.washColor ?? color.surface.base }),
              opacity: barOpacity ?? 0,
            },
          ]}
          pointerEvents={barActive ? "auto" : "none"}
          accessibilityElementsHidden={!barActive}
          importantForAccessibility={barActive ? "auto" : "no-hide-descendants"}
        >
          {ios ? (
            <>
              <View style={styles.wash} testID="detail-top-bar-wash" pointerEvents="none">
                <GradientFill
                  direction="vertical"
                  color={body.washColor ?? color.surface.base}
                  stops={color.gradient.detailStrip.wash}
                />
              </View>
              <View style={styles.wash} testID="detail-top-bar-shade" pointerEvents="none">
                <GradientFill
                  direction="vertical"
                  color={color.surface.base}
                  stops={color.gradient.detailStrip.shade}
                />
              </View>
            </>
          ) : null}
          <View style={styles.barRow} pointerEvents="box-none">
            {ios ? (
              <View style={styles.barSpacer} testID="detail-top-bar-back-slot" />
            ) : (
              <IconButton icon="chevronLeft" accessibilityLabel={backLabel} onPress={onBack} />
            )}
            <View style={styles.barTitle}>
              <Text variant="subtitle" align="center" numberOfLines={1}>
                {body.title}
              </Text>
            </View>
            {more ? (
              <IconButton icon="ellipsis" accessibilityLabel={more.label} onPress={more.onPress} />
            ) : (
              <View style={styles.barSpacer} />
            )}
          </View>
        </Animated.View>
      ) : null}
      <Animated.View
        testID="detail-buttons"
        style={[
          styles.buttons,
          buttonsPosition,
          buttonsOpacity && !ios ? { opacity: buttonsOpacity } : null,
        ]}
        pointerEvents={floatingContainerActive ? "box-none" : "none"}
        accessibilityElementsHidden={!floatingContainerActive}
        importantForAccessibility={floatingContainerActive ? "auto" : "no-hide-descendants"}
      >
        <View style={styles.buttonsRow} pointerEvents="box-none">
          <GlassSurface variant="circle">
            <IconButton icon="chevronLeft" accessibilityLabel={backLabel} onPress={onBack} />
          </GlassSurface>
          {more ? (
            ios ? (
              <Animated.View
                testID="detail-floating-more"
                style={buttonsOpacity ? { opacity: buttonsOpacity } : null}
                pointerEvents={floatingActive ? "box-none" : "none"}
                accessibilityElementsHidden={!floatingActive}
                importantForAccessibility={floatingActive ? "auto" : "no-hide-descendants"}
              >
                <GlassSurface variant="circle">
                  <IconButton
                    icon="ellipsis"
                    accessibilityLabel={more.label}
                    onPress={more.onPress}
                  />
                </GlassSurface>
              </Animated.View>
            ) : (
              <GlassSurface variant="circle">
                <IconButton
                  icon="ellipsis"
                  accessibilityLabel={more.label}
                  onPress={more.onPress}
                />
              </GlassSurface>
            )
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.base },
  fill: { flex: 1 },
  hero: { alignItems: "center", paddingBottom: spacing.xl },
  washNeutral: StyleSheet.absoluteFill,
  wash: StyleSheet.absoluteFill,
  imageHero: {
    alignSelf: "stretch",
    aspectRatio: layout.heroImageRatio,
    justifyContent: "flex-end",
    backgroundColor: color.surface.card,
  },
  fade: StyleSheet.absoluteFill,
  imageTitle: { paddingHorizontal: layout.gutter, paddingBottom: spacing.lg },
  title: { paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  loadingMore: { gap: spacing.md, paddingHorizontal: layout.gutter, paddingTop: spacing.md },
  buttons: { position: "absolute", left: layout.gutter, right: layout.gutter },
  bar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: layout.gutter },
  barRow: {
    height: layout.controlHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  barTitle: { flex: 1 },
  barSpacer: { width: layout.controlHeight },
  buttonsRow: { flexDirection: "row", justifyContent: "space-between" },
});
