// apps/mobile/test/screens/player/Autoplay.test.tsx
//
// Tests for the player's autoplay: the root component, the up next trigger and the autoplay switch.
//
// Tested:
// - Autoplay next to PlayerScreen, with the up next tab and its AutoplaySwitch
//
// What is covered:
// - the suggestions requested once per source, at the first of two triggers (the up next tab opens, the last track starts), never when a source starts, and not while another tab is shown
// - the up next read carrying the playing source, asked again for the same seed under a new source and under a track source once autoplayed
// - the list kept while the source plays, a new source asking at its own trigger
// - the end of the queue: the first suggestion then the next one with autoplay on, a pause at 0 with autoplay off, with no suggestions or when they failed
// - the switch: on by default, stored when turned off and read back by a fresh app, the error with retry when the setting cannot be read, es
//
// Run with: pnpm --filter @beatly/mobile test -- Autoplay
//
// SEE: apps/mobile/src/screens/player/Autoplay.tsx

import type { HttpOutcome, PlayableTrack, StoragePort, UpNext } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { Autoplay } from "../../../src/screens/player/Autoplay.tsx";
import { PlayerScreen } from "../../../src/screens/player/PlayerScreen.tsx";
import {
  makeCore,
  memoryStorage,
  noSheetNudge,
  upNextFixture,
  Wrapper,
} from "../../helpers/core.tsx";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));

const en = resources.en;
const es = resources.es;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [{ id: "ar1", name: "Ann" }],
  album: "Album",
  albumId: "a1",
  coverUrl: null,
  durationSeconds: 248,
});
const album = { kind: "album", id: "a1", name: "Test Album" } as const;
const otherAlbum = { kind: "album", id: "a2", name: "Other Album" } as const;

const ok = <T,>(data: T): HttpOutcome<T> => ({ kind: "success", data, maxAgeSeconds: 0 });
const failed = { kind: "transport_failure", cause: "network" } as const;

const refOf = (id: string) => ({
  track_id: id,
  title: `Up ${id}`,
  artists: [{ id: "ar1", name: "Ann" }],
  album: "Album",
  album_id: "a1",
  duration_seconds: 248,
  thumbnail_url: null,
});
// The up next answer of a track: the track itself first, then its own suggestions.
const answerFor = (trackId: string): UpNext =>
  trackId === "t1" ? upNextFixture : { tracks: [refOf(trackId), refOf("v2")] };

type CoreOptions = Parameters<typeof makeCore>[0];

async function setup(options: CoreOptions = {}) {
  const ctx = makeCore({
    sheetNudge: noSheetNudge,
    getUpNext: (id) => Promise.resolve(ok(answerFor(id))),
    ...options,
  });
  const rendered = await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlayerScreen />
        <Autoplay />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return { ...ctx, unmount: rendered.unmount };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

const play = (ctx: Ctx, ids: string[], source: typeof album | typeof otherAlbum = album) =>
  act(async () => {
    await ctx.playback.playList(ids.map(track), 0, source);
  });
const ended = async (ctx: Ctx, times = 1) => {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      ctx.player.emit({ type: "ended" });
      await Promise.resolve();
    });
  }
};
const openSheet = () => fireEvent.press(screen.getByRole("button", { name: en.player.sheet.open }));
const selectTab = (name: string) => fireEvent.press(screen.getByRole("tab", { name }));
const suggestionTitles = () =>
  screen.getAllByText(/^Up u|^Up v/).map((node) => String(node.props.children));
const callsFor = (ctx: Ctx, id: string) =>
  ctx.getUpNext.mock.calls.filter((call) => call[0] === id).length;

describe("when the suggestions are requested", () => {
  it("does not request them when a source starts", async () => {
    const ctx = await setup();
    await play(ctx, ["t1", "t2", "t3"]);
    await ended(ctx);
    expect(ctx.getUpNext).not.toHaveBeenCalled();
  });

  it("requests them once when the up next tab opens, and not again as the source plays", async () => {
    const ctx = await setup();
    await play(ctx, ["t1", "t2", "t3"]);
    await openSheet();
    await screen.findByText("Up u2");
    expect(ctx.getUpNext).toHaveBeenCalledTimes(1);
    expect(ctx.getUpNext).toHaveBeenCalledWith("t1", album);
    const titles = screen
      .getAllByText(/^(Song t[23]|Up u)/)
      .map((node) => String(node.props.children));
    expect(titles).toEqual(["Song t2", "Song t3", "Up u2", "Up u3"]);
    await ended(ctx, 2);
    expect(ctx.playback.getState().current?.trackId).toBe("t3");
    await fireEvent.press(screen.getByRole("button", { name: en.player.sheet.close }));
    await openSheet();
    expect(ctx.getUpNext).toHaveBeenCalledTimes(1);
    expect(suggestionTitles()).toEqual(["Up u2", "Up u3"]);
  });

  it("requests them once when the last track starts, with the sheet never opened", async () => {
    const ctx = await setup();
    await play(ctx, ["t1", "t2", "t3"]);
    await ended(ctx, 2);
    await waitForCalls(ctx, 1);
    expect(ctx.getUpNext).toHaveBeenCalledWith("t1", album);
    await openSheet();
    expect(await screen.findByText("Up u2")).toBeTruthy();
    expect(ctx.getUpNext).toHaveBeenCalledTimes(1);
  });

  it("requests them when a one-track source starts", async () => {
    const ctx = await setup();
    await play(ctx, ["t1"]);
    await waitForCalls(ctx, 1);
    expect(ctx.getUpNext).toHaveBeenCalledWith("t1", album);
  });

  it("requests the suggestions of a new source at its own trigger and draws them", async () => {
    const open = await setup();
    await play(open, ["t1", "t2", "t3"]);
    await openSheet();
    await screen.findByText("Up u2");
    expect(open.getUpNext).toHaveBeenCalledTimes(1);
    await play(open, ["x1", "x2"], otherAlbum);
    expect(await screen.findByText("Up v2")).toBeTruthy();
    expect(callsFor(open, "x1")).toBe(1);
    expect(screen.queryByText("Up u2")).toBeNull();
  });

  it("requests the same seed again under a new source", async () => {
    const ctx = await setup({
      getUpNext: () => Promise.resolve({ kind: "success", data: upNextFixture, maxAgeSeconds: 60 }),
    });
    await play(ctx, ["t1"]);
    await waitForCalls(ctx, 1);
    await play(ctx, ["t1"], otherAlbum);
    await waitForCalls(ctx, 2);
    expect(callsFor(ctx, "t1")).toBe(2);
    expect(ctx.getUpNext).toHaveBeenLastCalledWith("t1", otherAlbum);
  });

  it("asks the suggestions of an autoplayed source under its track source", async () => {
    const ctx = await setup();
    await play(ctx, ["t1"]);
    await waitForCalls(ctx, 1);
    await ended(ctx);
    expect(ctx.playback.getState().current?.trackId).toBe("u2");
    await ended(ctx);
    await waitForCalls(ctx, 2);
    expect(ctx.getUpNext).toHaveBeenLastCalledWith("u2", {
      kind: "track",
      id: "t1",
      name: "Song t1",
    });
  });

  it("does not request a new source's suggestions until its last track starts when the sheet is closed", async () => {
    const ctx = await setup();
    await play(ctx, ["x1", "x2"], otherAlbum);
    expect(callsFor(ctx, "x1")).toBe(0);
    await ended(ctx);
    await waitForCalls(ctx, 1);
    expect(callsFor(ctx, "x1")).toBe(1);
  });

  it("does not request them when the sheet shows another tab", async () => {
    const ctx = await setup();
    await play(ctx, ["t1", "t2", "t3"]);
    await openSheet();
    await screen.findByText("Up u2");
    await selectTab(en.player.sheet.tabs.lyrics);
    await play(ctx, ["x1", "x2"], otherAlbum);
    expect(callsFor(ctx, "x1")).toBe(0);
    await selectTab(en.player.sheet.tabs.upNext);
    expect(await screen.findByText("Up v2")).toBeTruthy();
    expect(callsFor(ctx, "x1")).toBe(1);
  });
});

async function waitForCalls(ctx: Ctx, count: number) {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(ctx.getUpNext).toHaveBeenCalledTimes(count);
}

describe("the end of the queue", () => {
  it("plays the first suggestion when the queue ends with autoplay on, then the next one", async () => {
    const ctx = await setup();
    await play(ctx, ["t1", "t2", "t3"]);
    await ended(ctx, 2);
    await waitForCalls(ctx, 1);
    await ended(ctx);
    const state = ctx.playback.getState();
    expect(state.current?.trackId).toBe("u2");
    expect(state.source).toEqual({ kind: "track", id: "t1", name: "Song t1" });
    expect(ctx.resolve).toHaveBeenLastCalledWith("u2");
    expect(ctx.getUpNext).toHaveBeenCalledTimes(1);
    await ended(ctx);
    expect(ctx.playback.getState().current?.trackId).toBe("u3");
  });

  it("pauses at 0 when the queue ends with autoplay off", async () => {
    const ctx = await setup({
      storage: memoryStorage({ "beatly-autoplay": "off" }),
    });
    await play(ctx, ["t1", "t2", "t3"]);
    await ended(ctx, 3);
    const state = ctx.playback.getState();
    expect(state.status).toBe("paused");
    expect(state.positionSeconds).toBe(0);
    expect(state.current?.trackId).toBe("t3");
  });

  it("pauses at the end when the suggestions are empty", async () => {
    const empty: UpNext = { tracks: [] };
    const ctx = await setup({ getUpNext: () => Promise.resolve(ok(empty)) });
    await play(ctx, ["t1"]);
    await openSheet();
    expect(await screen.findByText(en.player.sheet.upNextEmpty)).toBeTruthy();
    await ended(ctx);
    expect(ctx.playback.getState().status).toBe("paused");
    expect(ctx.playback.getState().current?.trackId).toBe("t1");
  });

  it("pauses at the end when the only suggestion is the requested track", async () => {
    const only: UpNext = { tracks: upNextFixture.tracks.slice(0, 1) };
    const ctx = await setup({ getUpNext: () => Promise.resolve(ok(only)) });
    await play(ctx, ["t1"]);
    await openSheet();
    expect(await screen.findByText(en.player.sheet.upNextEmpty)).toBeTruthy();
    await ended(ctx);
    expect(ctx.playback.getState().status).toBe("paused");
    expect(ctx.playback.getState().current?.trackId).toBe("t1");
  });

  const failures: [string, HttpOutcome<UpNext>][] = [
    ["a transport failure", failed],
    ["track_not_found", { kind: "api_failure", reason: "track_not_found" }],
    ["upstream_error", { kind: "api_failure", reason: "upstream_error" }],
    ["upstream_timeout", { kind: "api_failure", reason: "upstream_timeout" }],
  ];

  it.each(failures)(
    "pauses at the end when the suggestions failed with %s",
    async (_name, outcome) => {
      const ctx = await setup({ getUpNext: () => Promise.resolve(outcome) });
      await play(ctx, ["t1", "t2"]);
      await openSheet();
      expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
      expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
      await ended(ctx, 2);
      expect(ctx.playback.getState().status).toBe("paused");
      expect(ctx.playback.getState().current?.trackId).toBe("t2");
    },
  );
});

describe("the autoplay switch", () => {
  it("is drawn on by default", async () => {
    const ctx = await setup();
    await play(ctx, ["t1", "t2"]);
    await openSheet();
    const toggle = await screen.findByLabelText(en.player.sheet.autoplay);
    expect(toggle.props.value).toBe(true);
    expect(screen.getByText(en.player.sheet.autoplayHelper)).toBeTruthy();
  });

  it("stores the switch turned off and a fresh app reads it off", async () => {
    const storage = memoryStorage();
    const first = await setup({ storage });
    await play(first, ["t1", "t2"]);
    await openSheet();
    const toggle = await screen.findByLabelText(en.player.sheet.autoplay);
    await fireEvent(toggle, "valueChange", false);
    await act(async () => {
      await Promise.resolve();
    });
    expect(await storage.get("beatly-autoplay")).toBe("off");
    await first.unmount();

    const second = await setup({ storage });
    await play(second, ["t1", "t2"]);
    await openSheet();
    const again = await screen.findByLabelText(en.player.sheet.autoplay);
    expect(again.props.value).toBe(false);
    await ended(second, 2);
    expect(second.playback.getState().status).toBe("paused");
    expect(second.playback.getState().current?.trackId).toBe("t2");
  });

  it("draws the error with retry when the setting cannot be read, and the end pauses", async () => {
    const base = memoryStorage();
    const storage: StoragePort = {
      ...base,
      get: (key) =>
        key === "beatly-autoplay" ? Promise.reject(new Error("unreadable")) : base.get(key),
    };
    const ctx = await setup({ storage });
    await play(ctx, ["t1", "t2"]);
    await openSheet();
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
    await ended(ctx, 2);
    expect(ctx.playback.getState().status).toBe("paused");
    expect(ctx.playback.getState().current?.trackId).toBe("t2");
  });

  it("leaves autoplay off when the read fails after a previous session left it on", async () => {
    const base = memoryStorage();
    let failRead: () => void = () => undefined;
    const storage: StoragePort = {
      ...base,
      get: (key) =>
        key === "beatly-autoplay"
          ? new Promise<string | null>((_resolve, reject) => {
              failRead = () => {
                reject(new Error("unreadable"));
              };
            })
          : base.get(key),
    };
    const ctx = await setup({ storage });
    await act(() => {
      ctx.playback.setAutoplay(true);
    });
    await act(async () => {
      failRead();
      await Promise.resolve();
    });
    await play(ctx, ["t1", "t2"]);
    await ended(ctx, 2);
    expect(ctx.playback.getState().status).toBe("paused");
    expect(ctx.playback.getState().current?.trackId).toBe("t2");
  });

  it("draws the switch in Spanish", async () => {
    await i18n.changeLanguage("es");
    const ctx = await setup();
    await play(ctx, ["t1", "t2"]);
    await fireEvent.press(screen.getByRole("button", { name: es.player.sheet.open }));
    expect(await screen.findByLabelText(es.player.sheet.autoplay)).toBeTruthy();
    expect(screen.getByText(es.player.sheet.autoplayHelper)).toBeTruthy();
  });
});
