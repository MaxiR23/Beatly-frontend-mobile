// INFO: provides the app's QueryClient to the tree and connects the device's connection to it once.
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { listenToConnection } from "../queries/onlineManager.ts";
import { createQueryClient } from "../queries/queryClient.ts";

export function QueryProvider({ children }: { readonly children: ReactNode }) {
  const [client] = useState(createQueryClient);
  useEffect(() => listenToConnection(), []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
