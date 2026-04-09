export const DEBT_COLOR_PALETTE = [
  "#4f46e5", // Indigo
  "#0891b2", // Cyan
  "#d97706", // Amber
  "#dc2626", // Red
  "#16a34a", // Green
  "#9333ea", // Purple
  "#e11d48", // Rose
  "#0d9488", // Teal
] as const;

/** Pick the next unused color from the palette, cycling if all are taken. */
export function pickNextColor(usedColors: (string | null)[]): string {
  const usedSet = new Set(usedColors.filter(Boolean));
  for (const color of DEBT_COLOR_PALETTE) {
    if (!usedSet.has(color)) return color;
  }
  return DEBT_COLOR_PALETTE[usedColors.length % DEBT_COLOR_PALETTE.length];
}
