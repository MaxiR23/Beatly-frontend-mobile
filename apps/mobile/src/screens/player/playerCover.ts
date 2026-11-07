// INFO: the side in points of the player's cover: the window width less the gutter on each side; the player and the next cover's prefetch both size from it.
import { layout } from "@beatly/ui";

export function playerCoverSize(windowWidth: number): number {
  return windowWidth - 2 * layout.gutter;
}
