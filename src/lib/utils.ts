import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: "PEN" | "USD" | "EUR" = "PEN"): string {
  const symbols: Record<string, string> = {
    PEN: "S/.",
    USD: "$",
    EUR: "€",
  };
  const symbol = symbols[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK: "Bank",
  CREDIT_CARD: "Credit Card",
  CASH: "Cash",
  SAVINGS: "Savings",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

export const CURRENCY_LABELS: Record<string, string> = {
  PEN: "PEN (S/.)",
  USD: "USD ($)",
  EUR: "EUR (€)",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  NOT_PAID: "Not Paid",
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
