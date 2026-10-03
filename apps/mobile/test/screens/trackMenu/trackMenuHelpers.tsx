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
import { SafeAreaProvider } from "react-native-safe-area-context";

import { TrackMenuButton } from "../../../src/screens/trackMenu/TrackMenuButton.tsx";
import { TrackMenuHost } from "../../../src/screens/trackMenu/TrackMenuHost.tsx";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

export const fullTrack: PlayableTrack = {
  trackId: "t1",
  title: "Menu Song",
  artists: [
    { id: null, name: "Guest" },
    { id: "ar1", name: "Ann" },
  ],
  album: "Album",
  albumId: "al1",
  coverUrl: "test://img/t1",
  durationSeconds: 200,
};

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export async function setupMenu(
  options: Parameters<typeof makeCore>[0] = {},
  host: { track?: PlayableTrack; ownPlaylistId?: string | null } = {},
) {
  const ctx = makeCore(options);
  const onOpenArtist = jest.fn<(id: string) => void>();
  const onOpenAlbum = jest.fn<(id: string) => void>();
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <TrackMenuHost
          ownPlaylistId={host.ownPlaylistId ?? null}
          onOpenArtist={onOpenArtist}
          onOpenAlbum={onOpenAlbum}
          bottomInset={0}
        >
          <TrackMenuButton track={host.track ?? fullTrack} />
        </TrackMenuHost>
      </SafeAreaProvider>
    </Wrapper>,
  );
  return { ...ctx, onOpenArtist, onOpenAlbum };
}
