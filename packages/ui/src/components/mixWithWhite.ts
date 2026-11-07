// INFO: a #rrggbb color mixed with white: each channel moves toward 255 by share (0 keeps the color, 1 is white), rounded, as lowercase #rrggbb; the input is the backend's image color, already a lowercase #rrggbb by the core schema.
export function mixWithWhite(hex: string, share: number): string {
  const channel = (start: number): string => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16);
    return Math.round(value + (255 - value) * share)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
