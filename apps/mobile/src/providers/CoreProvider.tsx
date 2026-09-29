// INFO: provides the wired core (ports and services) to the tree.
import { createContext, useContext, type ReactNode } from "react";

import type { Core } from "../createCore.ts";

const CoreContext = createContext<Core | null>(null);

export function CoreProvider({
  core,
  children,
}: {
  readonly core: Core;
  readonly children: ReactNode;
}) {
  return <CoreContext.Provider value={core}>{children}</CoreContext.Provider>;
}

export function useCore(): Core {
  const core = useContext(CoreContext);
  if (core === null) throw new Error("useCore outside CoreProvider");
  return core;
}
