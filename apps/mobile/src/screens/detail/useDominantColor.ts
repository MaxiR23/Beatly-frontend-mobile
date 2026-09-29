// INFO: the dominant color of an image url as a string, or null until it is known and wherever it is unavailable; a failure is logged and leaves the neutral surfaces.
import { useEffect, useState } from "react";

import { getDominantColor, peekDominantColor } from "../../adapters/imageColors.ts";
import { useCore } from "../../providers/CoreProvider.tsx";

export function useDominantColor(url: string | null): string | null {
  const { log } = useCore();
  const [resolved, setResolved] = useState<{ url: string; value: string } | null>(null);

  const peeked = url === null ? undefined : peekDominantColor(url);
  const fromCache = peeked?.kind === "color" ? peeked.value : null;

  useEffect(() => {
    if (url === null || peekDominantColor(url) !== undefined) {
      return;
    }
    let ignore = false;
    void getDominantColor(url).then((result) => {
      if (ignore) return;
      if (result.kind === "color") {
        setResolved({ url, value: result.value });
      } else if (result.kind === "failed") {
        log.warn("imageColors.failed", { message: result.message });
      }
    });
    return () => {
      ignore = true;
    };
  }, [url, log]);

  if (fromCache !== null) return fromCache;
  return resolved !== null && resolved.url === url ? resolved.value : null;
}
