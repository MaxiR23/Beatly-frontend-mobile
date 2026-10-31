// INFO: one recommendation slot of the home drawn from the loaded set: albums for you, a seed section (its photo, prefix and seed name over the seed's items), recommended albums or recommended artists, each album under its artists and each artist under its kind (the reason lives only in the seed headers); a list that is empty or a seed section that did not come draws nothing. It only maps the response, in the order it comes.
import type {
  Recommendations,
  RecommendedAlbum,
  RecommendedArtist,
  SeedSectionItem,
} from "@beatly/core";
import { Carousel, type CarouselItem } from "@beatly/ui/native";
import { useRouter } from "expo-router";

import { useT } from "../../adapters/i18n.ts";

export type RecommendationSlot =
  | { kind: "albumsForYou" }
  | { kind: "seed"; index: 0 | 1 | 2 }
  | { kind: "recommendedAlbums" }
  | { kind: "recommendedArtists" };

const seedPrefixKey = ["seedPrefix.first", "seedPrefix.second", "seedPrefix.third"] as const;

export function RecommendationSection({
  slot,
  data,
}: {
  slot: RecommendationSlot;
  data: Recommendations;
}) {
  const t = useT("home");
  const ta = useT("album");
  const router = useRouter();

  const openAlbum = (id: string) => {
    router.push({ pathname: "/album/[id]", params: { id } });
  };
  const openArtist = (id: string) => {
    router.push({ pathname: "/artist/[id]", params: { id } });
  };

  const albumArtists = (album: { artists: readonly { name: string }[] }) =>
    album.artists.map((artist) => artist.name).join(ta("artistSeparator"));

  const toAlbumItem = (album: RecommendedAlbum): CarouselItem => ({
    key: `album:${album.id}`,
    title: album.title,
    subtitle: albumArtists(album),
    images: album.image ? [album.image] : [],
    shape: "square",
    onPress: () => {
      openAlbum(album.id);
    },
  });

  const toArtistItem = (artist: RecommendedArtist): CarouselItem => ({
    key: `artist:${artist.id}`,
    title: artist.name,
    subtitle: t("kind.artist"),
    images: artist.image ? [artist.image] : [],
    shape: "round",
    align: "center",
    onPress: () => {
      openArtist(artist.id);
    },
  });

  const toSeedItem = (item: SeedSectionItem): CarouselItem =>
    item.type === "artist"
      ? {
          key: `artist:${item.id}`,
          title: item.name,
          subtitle: t("kind.artist"),
          images: item.image ? [item.image] : [],
          shape: "round",
          onPress: () => {
            openArtist(item.id);
          },
        }
      : {
          key: `album:${item.id}`,
          title: item.title,
          subtitle: albumArtists(item),
          images: item.image ? [item.image] : [],
          shape: "square",
          onPress: () => {
            openAlbum(item.id);
          },
        };

  switch (slot.kind) {
    case "albumsForYou":
      return data.albums_for_you.length === 0 ? null : (
        <Carousel
          testID="rec-albums-for-you"
          title={t("albumsForYou")}
          items={data.albums_for_you.map(toAlbumItem)}
        />
      );
    case "recommendedAlbums":
      return data.recommended_albums.length === 0 ? null : (
        <Carousel
          testID="rec-recommended-albums"
          title={t("recommendedAlbums")}
          items={data.recommended_albums.map(toAlbumItem)}
        />
      );
    case "recommendedArtists":
      return data.recommended_artists.length === 0 ? null : (
        <Carousel
          testID="rec-recommended-artists"
          title={t("recommendedArtists")}
          items={data.recommended_artists.map(toArtistItem)}
        />
      );
    case "seed": {
      const section = data.seed_sections[slot.index];
      if (section === undefined || section.items.length === 0) return null;
      return (
        <Carousel
          testID={`rec-seed-${String(slot.index)}`}
          title={section.seed.name}
          lead={{
            images: section.seed.image ? [section.seed.image] : [],
            overline: t(seedPrefixKey[slot.index]),
          }}
          items={section.items.map(toSeedItem)}
        />
      );
    }
  }
}
