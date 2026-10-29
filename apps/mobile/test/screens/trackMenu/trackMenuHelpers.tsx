// apps/mobile/test/screens/trackMenu/trackMenuHelpers.tsx
//
// Test helper: renders a track menu button inside its host, inside the providers.
//
// Tested:
// - Not a test itself; used by the track menu sheet tests
//
// What is covered:
// apps/mobile/test/screens/trackMenu
//
import type { PlayableTrack } from "@beatly/core";
import { jest } from "@jest/globals";
import { render } from "@testing-library/react-native";

import { TrackMenuButton } from "../../../src/screens/trackMenu/TrackMenuButton.tsx";
import { TrackMenuHost } from "../../../src/screens/trackMenu/TrackMenuHost.tsx";
import { makeCore, tiers, Wrapper } from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";

export const fullTrack: PlayableTrack = {
  trackId: "t1",
  title: "Menu Song",
  artists: [
    { id: "ar1", name: "Ann" },
    { id: null, name: "Guest" },
  ],
  album: "Album",
  albumId: "al1",
  coverUrl: "test://img/t1",
  image: tiers("t1"),
  durationSeconds: 200,
};

export async function setupMenu(
  options: Parameters<typeof makeCore>[0] = {},
  host: { track?: PlayableTrack; ownPlaylistId?: string | null; tab?: boolean } = {},
) {
  const ctx = makeCore(options);
  const onOpenArtist = jest.fn<(id: string) => void>();
  const onOpenAlbum = jest.fn<(id: string) => void>();
  await render(
    <Wrapper core={ctx.core}>
      <Insets tab={host.tab ?? false}>
        <TrackMenuHost
          ownPlaylistId={host.ownPlaylistId ?? null}
          onOpenArtist={onOpenArtist}
          onOpenAlbum={onOpenAlbum}
          bottomInset={0}
        >
          <TrackMenuButton track={host.track ?? fullTrack} />
        </TrackMenuHost>
      </Insets>
    </Wrapper>,
  );
  return { ...ctx, onOpenArtist, onOpenAlbum };
}
