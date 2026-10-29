// INFO: the window's safe-area insets, read once above the navigators; a Sheet is a Modal over the whole window, so it keeps clear of the window's edges, never of a native tab's bar (expo-router's iOS native tabs give each tab its own safe-area provider, whose bottom includes the tab bar).
import { createContext, useContext, type ReactNode } from "react";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

const WindowInsetsContext = createContext<EdgeInsets | null>(null);

export function WindowInsetsProvider({ children }: { readonly children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <WindowInsetsContext.Provider value={insets}>{children}</WindowInsetsContext.Provider>;
}

export function useWindowInsets(): EdgeInsets {
  const insets = useContext(WindowInsetsContext);
  if (insets === null) throw new Error("useWindowInsets outside WindowInsetsProvider");
  return insets;
}
