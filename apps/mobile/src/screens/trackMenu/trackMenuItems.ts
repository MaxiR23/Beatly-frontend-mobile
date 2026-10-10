// INFO: the items the track menu offers for one track, in order, only those that apply: like or remove from liked and add to a playlist when the track carries what their routes require, go to the artist (the first with an id) and the album when they are known, credits always, remove from this playlist inside an own playlist, and report a problem always, last.
import { addTrackInputOf, likeInputOf, type PlayableTrack } from "@beatly/core";
import type { IconName } from "@beatly/ui/native";

export type TrackMenuItemKey =
  | "like"
  | "unlike"
  | "addToPlaylist"
  | "goToArtist"
  | "goToAlbum"
  | "credits"
  | "removeFromPlaylist"
  | "report";

export interface TrackMenuItem {
  key: TrackMenuItemKey;
  labelKey: `items.${TrackMenuItemKey}`;
  icon: IconName;
  destructive: boolean;
  // The id the go to artist item opens.
  artistId?: string;
  // The id the go to album item opens.
  albumId?: string;
}

export function trackMenuItems(
  track: PlayableTrack,
  ctx: { liked: boolean; ownPlaylistId: string | null },
): TrackMenuItem[] {
  const items: TrackMenuItem[] = [];
  if (likeInputOf(track) !== null) {
    items.push(
      ctx.liked
        ? { key: "unlike", labelKey: "items.unlike", icon: "heart", destructive: false }
        : { key: "like", labelKey: "items.like", icon: "heart", destructive: false },
    );
  }
  if (addTrackInputOf(track) !== null) {
    items.push({
      key: "addToPlaylist",
      labelKey: "items.addToPlaylist",
      icon: "plus",
      destructive: false,
    });
  }
  const artistId = track.artists.find((artist) => artist.id !== null)?.id;
  if (artistId !== undefined && artistId !== null) {
    items.push({
      key: "goToArtist",
      labelKey: "items.goToArtist",
      icon: "user",
      destructive: false,
      artistId,
    });
  }
  if (track.albumId !== null) {
    items.push({
      key: "goToAlbum",
      labelKey: "items.goToAlbum",
      icon: "music",
      destructive: false,
      albumId: track.albumId,
    });
  }
  items.push({ key: "credits", labelKey: "items.credits", icon: "info", destructive: false });
  if (ctx.ownPlaylistId !== null) {
    items.push({
      key: "removeFromPlaylist",
      labelKey: "items.removeFromPlaylist",
      icon: "x",
      destructive: true,
    });
  }
  items.push({ key: "report", labelKey: "items.report", icon: "flag", destructive: false });
  return items;
}
