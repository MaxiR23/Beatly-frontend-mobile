# 020. Shared detail routes per tab

How a detail screen opens from every tab and keeps that tab's back stack.

## Context

An album opens from Home, Search, Library and from another album. Back must return
to the screen that opened it, in the same tab, with that tab still selected. A
route at the root of the app would leave the tab and lose the selection.

## Decision

- The four tabs are the groups `(home)`, `(explore)`, `(search)` and `(library)`
  under `(tabs)`. Their URLs do not change.
- One layout, in the array group `(home,explore,search,library)`, declares a stack
  for each tab, with `unstable_settings` naming each tab's initial route. The
  detail routes live in the same folder, so expo-router materializes a copy in
  each tab and resolves the one in the current tab when a route is pushed.
- The tab roots live in their own group folders, which expo-router merges with the
  expanded array group. The explore nested stack layout goes away: the shared
  stack replaces it.
- Rejected: a root-level detail route (it leaves the tab); one layout file per tab
  (four copies of the same stack).

## Consequences

- The route names of the tab navigator are the group names.
- A new detail screen is one file in the array folder.
- The NativeTabs branch (iOS 26+) is checked by hand.
