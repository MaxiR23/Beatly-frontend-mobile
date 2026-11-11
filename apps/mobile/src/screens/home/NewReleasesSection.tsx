// INFO: the new releases shelf of the home, self-contained so it can move to Explore: an unlabelled skeleton while it loads, nothing on a failure or an empty list, else a carousel of square album cards, each under its type and its artists, that opens the album and loads the next page at the end.
import type { NewRelease } from "@beatly/core";
import { Carousel, CarouselSkeleton, type CarouselItem } from "@beatly/ui/native";
import { useRouter } from "expo-router";

import { useT } from "../../adapters/i18n.ts";
import { useNewReleases } from "../../queries/useNewReleases.ts";
import { albumArtists } from "../album/albumArtists.ts";

export function NewReleasesSection() {
  const t = useT("home");
  const ta = useT("album");
  const router = useRouter();
  const releases = useNewReleases();

  const kindOf = (release: NewRelease) =>
    release.type === "album"
      ? t("kind.album")
      : release.type === "single"
        ? t("releaseType.single")
        : t("releaseType.ep");

  const toItem = (release: NewRelease): CarouselItem => ({
    key: release.album_id,
    title: release.title,
    subtitle: t("meta", { kind: kindOf(release), owner: albumArtists(release, ta) }),
    images: release.image ? [release.image] : [],
    shape: "square",
    onPress: () => {
      router.push({ pathname: "/album/[id]", params: { id: release.album_id } });
    },
  });

  if (releases.isPending) return <CarouselSkeleton testID="new-releases-skeleton" />;
  if (!releases.isSuccess || releases.data.length === 0) return null;
  return (
    <Carousel
      testID="new-releases"
      title={t("newReleases")}
      items={releases.data.map(toItem)}
      onEndReached={releases.loadMore}
    />
  );
}
