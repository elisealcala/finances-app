import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `S/. ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentage(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

export const DEBT_TYPE_LABELS: Record<string, string> = {
  CREDIT_CARD: "Credit Card",
  PERSONAL_LOAN: "Personal Loan",
  MORTGAGE: "Mortgage",
  AUTO_LOAN: "Auto Loan",
  STUDENT_LOAN: "Student Loan",
  OTHER: "Other",
};
