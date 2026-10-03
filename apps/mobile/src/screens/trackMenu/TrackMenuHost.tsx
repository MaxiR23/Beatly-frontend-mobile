// INFO: one per screen with track rows: it owns which sheet is open (the Android and fallback menu, the playlist picker, the credits) and a brief floating notice, and gives the rows' menu buttons the actions (open, select an item, like); a like that the backend refuses or the device cannot store shows the generic error notice, a pending one shows nothing because the service sends it again on the next sync.
import { likeInputOf, type PlayableTrack } from "@beatly/core";
import { layout, motion, spacing } from "@beatly/ui";
import { Notice } from "@beatly/ui/native";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useLikesActions } from "../../queries/useLikes.ts";
import { useRemoveFromPlaylist } from "../../queries/usePlaylists.ts";
import { CreditsSheet } from "./CreditsSheet.tsx";
import { PlaylistPickerSheet } from "./PlaylistPickerSheet.tsx";
import { TrackMenuSheet } from "./TrackMenuSheet.tsx";
import { TrackMenuContext } from "./trackMenuContext.ts";
import type { TrackMenuItem } from "./trackMenuItems.ts";

interface TrackMenuHostProps {
  // The playlist the rows belong to when it is the caller's own: only then the menu offers remove.
  ownPlaylistId?: string | null;
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
  // The space the floating notice leaves under itself.
  bottomInset: number;
  children: ReactNode;
}

type Open = { sheet: "menu" | "picker" | "credits"; track: PlayableTrack } | null;

export function TrackMenuHost({
  ownPlaylistId = null,
  onOpenArtist,
  onOpenAlbum,
  bottomInset,
  children,
}: TrackMenuHostProps) {
  const tc = useT("common");
  const likes = useLikesActions();
  const remove = useRemoveFromPlaylist();
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<{ tone: "error"; message: string } | null>(null);

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, motion.duration.notice);
    return () => {
      clearTimeout(timer);
    };
  }, [notice]);

  const showError = () => {
    setNotice({ tone: "error", message: tc("error.generic") });
  };

  const toggleLike = async (track: PlayableTrack) => {
    const input = likeInputOf(track);
    if (input === null) return;
    const outcome = await likes.setLiked(input, !likes.isLiked(track.trackId));
    if (outcome.kind === "rejected" || outcome.kind === "storage_failure") showError();
  };

  const select = (item: TrackMenuItem, track: PlayableTrack) => {
    switch (item.key) {
      case "like":
      case "unlike":
        setOpen(null);
        void toggleLike(track);
        break;
      case "addToPlaylist":
        setOpen({ sheet: "picker", track });
        break;
      case "credits":
        setOpen({ sheet: "credits", track });
        break;
      case "goToArtist":
        setOpen(null);
        if (item.artistId !== undefined) onOpenArtist(item.artistId);
        break;
      case "goToAlbum":
        setOpen(null);
        if (item.albumId !== undefined) onOpenAlbum(item.albumId);
        break;
      case "removeFromPlaylist":
        setOpen(null);
        if (ownPlaylistId !== null) {
          remove.mutate(
            { playlistId: ownPlaylistId, trackId: track.trackId },
            { onError: showError },
          );
        }
        break;
    }
  };

  const close = () => {
    setOpen(null);
  };

  return (
    <TrackMenuContext.Provider
      value={{
        ownPlaylistId,
        openMenu: (track) => {
          setOpen({ sheet: "menu", track });
        },
        select,
        toggleLike,
      }}
    >
      <View style={styles.host}>
        {children}
        {open?.sheet === "menu" ? <TrackMenuSheet track={open.track} onClose={close} /> : null}
        {open?.sheet === "picker" ? (
          <PlaylistPickerSheet track={open.track} onClose={close} />
        ) : null}
        {open?.sheet === "credits" ? <CreditsSheet track={open.track} onClose={close} /> : null}
        {notice !== null ? (
          <View
            pointerEvents="none"
            style={[styles.notice, { bottom: bottomInset + spacing.md }]}
            testID="track-menu-notice"
          >
            <Notice floating tone={notice.tone} message={notice.message} />
          </View>
        ) : null}
      </View>
    </TrackMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  notice: { position: "absolute", left: layout.gutter, right: layout.gutter },
});
