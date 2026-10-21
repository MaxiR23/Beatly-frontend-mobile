// INFO: the pure math of the detail header's collapse: the scroll ranges of the cover, the floating buttons, the title and the top bar, derived from the measured hero and title heights, and the phase that decides which of the two button sets takes touches.
import { motion } from "../tokens/motion.ts";
import { layout } from "../tokens/spacing.ts";

export type CollapseRange = readonly [number, number];

export interface CollapseRanges {
  cover: CollapseRange;
  buttons: CollapseRange;
  title: CollapseRange;
  bar: CollapseRange;
}

export type CollapsePhase = "expanded" | "between" | "collapsed";

// Null until both heights are measured; the screen then draws statically.
export function collapseRanges(input: {
  hero: "cover" | "image";
  heroHeight: number | null;
  titleHeight: number | null;
  topInset: number;
}): CollapseRanges | null {
  const { hero, heroHeight, titleHeight, topInset } = input;
  if (heroHeight === null) return null;
  if (hero === "cover" && titleHeight === null) return null;
  const titleBottom = hero === "cover" ? heroHeight + (titleHeight ?? 0) : heroHeight;
  const fade = motion.detailCollapse.fade;
  const barBottom = topInset + layout.controlHeight;
  const gone = Math.max(0, titleBottom - barBottom);
  const titleStart = Math.max(0, gone - fade);
  const buttonsStart = Math.max(0, titleStart - fade);
  const barStart = Math.max(0, gone - motion.detailCollapse.barLead * fade);
  return {
    cover: [0, titleStart],
    buttons: [buttonsStart, titleStart],
    title: [titleStart, gone],
    bar: [barStart, barStart + fade],
  };
}

// expanded: offset < buttons[1]; collapsed: offset >= bar[0]; between otherwise; null ranges: expanded.
export function collapsePhase(offset: number, ranges: CollapseRanges | null): CollapsePhase {
  if (ranges === null) return "expanded";
  if (offset < ranges.buttons[1]) return "expanded";
  if (offset >= ranges.bar[0]) return "collapsed";
  return "between";
}
