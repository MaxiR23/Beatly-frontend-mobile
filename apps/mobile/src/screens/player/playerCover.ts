// INFO: the side in points of the player's cover: the window width less the column's side padding; the player and the next cover's prefetch both size from it.
import { spacing } from "@beatly/ui";

export function playerCoverSize(windowWidth: number): number {
  return windowWidth - 2 * spacing.xl;
}
