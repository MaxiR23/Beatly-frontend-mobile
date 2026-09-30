// INFO: the player route's options: a see-through modal over the tabs that slides, or fades under reduce motion.
import { color } from "@beatly/ui";

export function playerRouteOptions(reduceMotion: boolean) {
  return {
    presentation: "transparentModal",
    animation: reduceMotion ? "fade" : "slide_from_bottom",
    contentStyle: { backgroundColor: color.overlay.clear },
  } as const;
}
