import { format } from "date-fns";
import type { ScheduleRow } from "@/app/(app)/finances/debt/components/schedule-table";

/**
 * Generate a CSV template with headers only (and optionally fee columns).
 */
export function generateScheduleTemplate(feeNames: string[] = []): string {
  const allFeeNames = feeNames.includes("Others")
    ? feeNames
    : [...feeNames, "Others"];
  const headers = [
    "Installment #",
    "Due Date",
    "Capital",
    "Interest",
    ...allFeeNames,
    "Total",
  ];
  return headers.join(",") + "\n";
}

/**
 * Convert schedule rows to CSV content string.
 */
export function scheduleRowsToCsv(rows: ScheduleRow[]): string {
  if (rows.length === 0) return "";

  const feeNames = rows[0].fees.map((f) => f.name);
  const hasOthers = feeNames.includes("Others");
  const allFeeNames = hasOthers ? feeNames : [...feeNames, "Others"];
  const headers = [
    "Installment #",
    "Due Date",
    "Capital",
    "Interest",
    ...allFeeNames,
    "Total",
  ];

  const dataLines = rows.map((row) => {
    const dueDate =
      row.dueDate instanceof Date ? row.dueDate : new Date(row.dueDate);
    const feeValues = row.fees.map((f) => f.amount.toFixed(2));
    if (!hasOthers) feeValues.push("0.00");
    return [
      row.installmentNumber,
      format(dueDate, "yyyy-MM-dd"),
      row.capital.toFixed(2),
      row.interest.toFixed(2),
      ...feeValues,
      row.totalAmount.toFixed(2),
    ].join(",");
  });

  return [headers.join(","), ...dataLines].join("\n");
}

/**
 * Parse a CSV string into schedule rows. Returns rows and detected fee column names.
 */
export function parseCsvToScheduleRows(csvText: string): {
  rows: ScheduleRow[];
  feeNames: string[];
} {
  const text = csvText.replace(/^\uFEFF/, ""); // strip BOM
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l);

  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]);

  const requiredHeaders = [
    "Installment #",
    "Due Date",
    "Capital",
    "Interest",
    "Total",
  ];
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new Error(`Missing required column: "${req}"`);
    }
  }

  const interestIdx = headers.indexOf("Interest");
  const totalIdx = headers.indexOf("Total");
  const feeNames = headers.slice(interestIdx + 1, totalIdx);

  const rows: ScheduleRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;

    const capital = parseFloat(values[headers.indexOf("Capital")]) || 0;
    const interest = parseFloat(values[headers.indexOf("Interest")]) || 0;
    const fees = feeNames.map((name, fIdx) => ({
      name,
      amount: parseFloat(values[interestIdx + 1 + fIdx]) || 0,
    }));
    const feeTotal = fees.reduce((sum, f) => sum + f.amount, 0);
    const total = capital + interest + feeTotal;

    const dateStr = values[headers.indexOf("Due Date")];
    const dueDate = new Date(
      dateStr + (dateStr.includes("T") ? "" : "T00:00:00"),
    );

    if (isNaN(dueDate.getTime())) {
      throw new Error(
        `Invalid date on row ${i + 1}: "${dateStr}". Use YYYY-MM-DD format.`,
      );
    }

    rows.push({
      installmentNumber:
        parseInt(values[headers.indexOf("Installment #")]) || i,
      dueDate,
      capital,
      interest,
      fees,
      totalAmount: Math.round(total * 100) / 100,
    });
  }

  if (rows.length === 0) {
    throw new Error("No valid data rows found in CSV.");
  }

  return { rows, feeNames };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  values.push(current.trim());

  return values;
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
