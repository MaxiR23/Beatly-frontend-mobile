// INFO: the only importer of react-native-image-colors; no port because core never needs a color; neutral where the native module is missing (Expo Go).
import { color } from "@beatly/ui";
import { requireOptionalNativeModule } from "expo";
import type * as ImageColors from "react-native-image-colors";

export type DominantColor =
  { kind: "color"; value: string } | { kind: "unavailable" } | { kind: "failed"; message: string };

// The promise per url, and the settled result per url for a synchronous peek.
const pending = new Map<string, Promise<DominantColor>>();
const settled = new Map<string, DominantColor>();

export function peekDominantColor(url: string): DominantColor | undefined {
  return settled.get(url);
}

async function load(url: string): Promise<DominantColor> {
  // The library evaluates its native module on import, which crashes where
  // the module is not built in (Expo Go), so it is checked before importing.
  if (requireOptionalNativeModule("ImageColors") === null) {
    return { kind: "unavailable" };
  }
  try {
    // A lazy require, not a dynamic import: Metro resolves both the same way, and jest cannot run a dynamic import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only once the native module is known to exist
    const { getColors } = require("react-native-image-colors") as typeof ImageColors;
    const result = await getColors(url, { fallback: color.surface.base, cache: false });
    return {
      kind: "color",
      value: result.platform === "ios" ? result.background : result.dominant,
    };
  } catch (error) {
    return { kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

export function getDominantColor(url: string): Promise<DominantColor> {
  const cached = pending.get(url);
  if (cached !== undefined) {
    return cached;
  }
  const promise = load(url).then((result) => {
    if (result.kind === "failed") {
      // A failure is not remembered, so a later mount can retry the url.
      pending.delete(url);
    } else {
      settled.set(url, result);
    }
    return result;
  });
  pending.set(url, promise);
  return promise;
}
