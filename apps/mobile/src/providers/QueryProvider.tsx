// INFO: provides the app's QueryClient to the tree.
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { createQueryClient } from "../queries/queryClient.ts";

export function QueryProvider({ children }: { readonly children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
