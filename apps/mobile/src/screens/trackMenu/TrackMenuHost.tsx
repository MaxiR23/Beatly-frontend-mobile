// INFO: one per screen with track rows: it owns which sheet is open (the Android and fallback menu, the playlist picker, the credits, the report form) and a brief floating notice, and gives the rows' menu buttons the actions (open, select an item, like); a like that the backend refuses or the device cannot store shows the generic error notice, a pending one shows nothing because the service sends it again on the next sync.
import { likeInputOf, type PlayableTrack } from "@beatly/core";
import { layout, motion, spacing } from "@beatly/ui";
import { Notice } from "@beatly/ui/native";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useLikesActions } from "../../queries/useLikes.ts";
import { useRemoveFromPlaylist } from "../../queries/usePlaylists.ts";
import { CreditsSheet } from "./CreditsSheet.tsx";
import { ReportProblemSheet } from "../bugReports/ReportProblemSheet.tsx";
import { PlaylistPickerSheet } from "./PlaylistPickerSheet.tsx";
import { TrackMenuSheet } from "./TrackMenuSheet.tsx";
import { TrackMenuContext } from "./trackMenuContext.ts";
import { useSheetPresence } from "./useSheetPresence.ts";
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
  const sheet = useSheetPresence<{
    sheet: "menu" | "picker" | "credits" | "report";
    track: PlayableTrack;
  }>();
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
        sheet.hide();
        void toggleLike(track);
        break;
      case "addToPlaylist":
        sheet.show({ sheet: "picker", track });
        break;
      case "credits":
        sheet.show({ sheet: "credits", track });
        break;
      case "report":
        sheet.show({ sheet: "report", track });
        break;
      case "goToArtist":
        sheet.hide();
        if (item.artistId !== undefined) onOpenArtist(item.artistId);
        break;
      case "goToAlbum":
        sheet.hide();
        if (item.albumId !== undefined) onOpenAlbum(item.albumId);
        break;
      case "removeFromPlaylist":
        sheet.hide();
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
    sheet.hide();
  };

  return (
    <TrackMenuContext.Provider
      value={{
        ownPlaylistId,
        openMenu: (track) => {
          sheet.show({ sheet: "menu", track });
        },
        select,
        toggleLike,
      }}
    >
      <View style={styles.host}>
        {children}
        {sheet.current?.sheet === "menu" ? (
          <TrackMenuSheet
            track={sheet.current.track}
            visible={sheet.visible}
            onClosed={sheet.closed}
            onClose={close}
          />
        ) : null}
        {sheet.current?.sheet === "picker" ? (
          <PlaylistPickerSheet
            track={sheet.current.track}
            visible={sheet.visible}
            onClosed={sheet.closed}
            onClose={close}
          />
        ) : null}
        {sheet.current?.sheet === "credits" ? (
          <CreditsSheet
            track={sheet.current.track}
            visible={sheet.visible}
            onClosed={sheet.closed}
            onClose={close}
          />
        ) : null}
        {sheet.current?.sheet === "report" ? (
          <ReportProblemSheet
            track={{ id: sheet.current.track.trackId, title: sheet.current.track.title }}
            visible={sheet.visible}
            onClosed={sheet.closed}
            onClose={close}
          />
        ) : null}
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
