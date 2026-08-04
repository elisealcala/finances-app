export const DEBT_COLOR_PALETTE = [
  "#5d78a6", // Slate blue
  "#4f8c8b", // Teal
  "#b9824f", // Ochre
  "#b45f5b", // Red
  "#5f876f", // Green
  "#7a6c91", // Purple
  "#a85d68", // Rose
  "#668f80", // Sage
] as const;

/** Pick the next unused color from the palette, cycling if all are taken. */
export function pickNextColor(usedColors: (string | null)[]): string {
  const usedSet = new Set(usedColors.filter(Boolean));
  for (const color of DEBT_COLOR_PALETTE) {
    if (!usedSet.has(color)) return color;
  }
  return DEBT_COLOR_PALETTE[usedColors.length % DEBT_COLOR_PALETTE.length];
}
