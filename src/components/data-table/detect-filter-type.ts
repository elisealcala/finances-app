export type FilterType = "text" | "select" | "number" | "date" | "boolean";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

function isDateLike(v: unknown): boolean {
  if (v instanceof Date) return true;
  if (typeof v !== "string") return false;
  if (!ISO_DATE_REGEX.test(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

/** Detect a column's filter type by sampling its values. */
export function detectFilterType(values: unknown[]): FilterType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "text";

  if (nonNull.every((v) => typeof v === "boolean")) return "boolean";
  if (nonNull.every((v) => typeof v === "number")) return "number";
  if (nonNull.every(isDateLike)) return "date";

  if (nonNull.every((v) => typeof v === "string")) {
    const unique = new Set(nonNull).size;
    if (unique <= 15) return "select";
    return "text";
  }

  return "text";
}
