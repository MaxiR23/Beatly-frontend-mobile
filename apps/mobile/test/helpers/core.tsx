// apps/mobile/test/helpers/core.tsx
//
// Test helper: builds a Core of inline port literals and renders a tree inside its providers.
//
// Tested:
// - Not a test itself; used by the screen, route and hook tests
//
// What is covered:
// apps/mobile/test/screens, apps/mobile/test/queries, apps/mobile/test/providers, apps/mobile/test/app
// (the profile, recents and playlists fixtures and fakes, and the page builder)
//
import type {
  ActivityService,
  AuthPort,
  HttpOutcome,
  LogPort,
  PageResult,
  PlaylistListItem,
  PlaylistsService,
  Profile,
  ProfileService,
  RecentEntity,
} from "@beatly/core";
import { jest } from "@jest/globals";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { CoreProvider } from "../../src/providers/CoreProvider.tsx";
import { createQueryClient } from "../../src/queries/queryClient.ts";

export const profileFixture: Profile = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "user",
  username: "maxi_23",
  display_name: "Maxi",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const recentFixture: RecentEntity = {
  entity_type: "album",
  entity_id: "a1",
  played_at: "2026-01-01T00:00:00Z",
  metadata: { title: "Recent album", subtitle: "Some artist", thumbnail_url: "test://img/r1" },
};

export const playlistFixture: PlaylistListItem = {
  id: "p1",
  owner_id: "00000000-0000-0000-0000-000000000001",
  title: "Road trip",
  description: "Windows down",
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};

export function pageOf<T>(
  items: T[],
  page: Partial<PageResult<T>["page"]> = {},
): HttpOutcome<PageResult<T>> {
  return {
    kind: "success",
    maxAgeSeconds: 0,
    data: {
      items,
      page: { limit: 50, next_cursor: null, has_more: false, total: items.length, ...page },
      restartedFromFirstPage: false,
    },
  };
}

export function successOf(data: Profile): HttpOutcome<Profile> {
  return { kind: "success", data, maxAgeSeconds: 0 };
}

function baseAuth() {
  return {
    getAccessToken: jest.fn<AuthPort["getAccessToken"]>(() => Promise.resolve("test-token")),
    getStatus: jest.fn<AuthPort["getStatus"]>(() => Promise.resolve("signed_in")),
    onAuthChange: jest.fn<AuthPort["onAuthChange"]>(() => () => undefined),
    signIn: jest.fn<AuthPort["signIn"]>(() => Promise.resolve({ kind: "success" })),
    signUp: jest.fn<AuthPort["signUp"]>(() => Promise.resolve({ kind: "confirmation_sent" })),
    signOut: jest.fn<AuthPort["signOut"]>(() => Promise.resolve({ kind: "success" })),
    confirmEmail: jest.fn<AuthPort["confirmEmail"]>(() => Promise.resolve({ kind: "success" })),
  };
}

export type MockAuth = ReturnType<typeof baseAuth>;

export function makeAuth(overrides: Partial<MockAuth> = {}): MockAuth {
  return { ...baseAuth(), ...overrides };
}

export function makeLog() {
  return {
    debug: jest.fn<LogPort["debug"]>(),
    info: jest.fn<LogPort["info"]>(),
    warn: jest.fn<LogPort["warn"]>(),
    error: jest.fn<LogPort["error"]>(),
  };
}

// Reads a flag of a node's accessibilityState without an untyped member access.
export function stateFlag(node: { props: unknown }, flag: "disabled" | "busy" | "checked") {
  const props = node.props;
  if (typeof props !== "object" || props === null || !("accessibilityState" in props))
    return undefined;
  const state = props.accessibilityState;
  if (typeof state !== "object" || state === null || !(flag in state)) return undefined;
  return (state as Record<string, unknown>)[flag];
}

export function makeCore(
  options: {
    auth?: MockAuth;
    getMyProfile?: ProfileService["getMyProfile"];
    listRecents?: ActivityService["listRecents"];
    listPlaylists?: PlaylistsService["listPlaylists"];
  } = {},
) {
  const auth = options.auth ?? makeAuth();
  const getMyProfile = jest.fn<ProfileService["getMyProfile"]>(
    options.getMyProfile ?? (() => Promise.resolve(successOf(profileFixture))),
  );
  const listRecents = jest.fn<ActivityService["listRecents"]>(
    options.listRecents ?? (() => Promise.resolve(pageOf<RecentEntity>([]))),
  );
  const listPlaylists = jest.fn<PlaylistsService["listPlaylists"]>(
    options.listPlaylists ?? (() => Promise.resolve(pageOf<PlaylistListItem>([]))),
  );
  const log = makeLog();
  const core: Core = {
    activity: { listRecents },
    auth,
    log,
    playlists: { listPlaylists },
    profile: { getMyProfile },
  };
  return { core, auth, log, getMyProfile, listRecents, listPlaylists };
}

export function Wrapper({
  core,
  client,
  children,
}: {
  core: Core;
  client?: QueryClient;
  children: ReactNode;
}) {
  return (
    <CoreProvider core={core}>
      <QueryClientProvider client={client ?? createQueryClient()}>{children}</QueryClientProvider>
    </CoreProvider>
  );
}
