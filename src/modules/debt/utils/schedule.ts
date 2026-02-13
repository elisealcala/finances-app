import { addMonths } from "date-fns";
import { teaToMonthlyRate, totalMonthlyFees } from "./amortization";
import type { DebtFee } from "../types";

export type InstallmentRow = {
  installmentNumber: number;
  dueDate: Date;
  capital: number;
  interest: number;
  fees: DebtFee[];
  totalAmount: number;
};

/** Generate an equal-payment amortization schedule.
 *  Uses the standard formula: PMT = P × r × (1+r)^n / ((1+r)^n - 1)
 *  Then walks month-by-month computing capital/interest split. */
export function generateEqualPaymentSchedule(params: {
  balance: number;
  interestRate: number; // TEA percentage
  termMonths: number;
  startDate: Date;
  dueDay: number;
  fees?: DebtFee[];
}): InstallmentRow[] {
  const { balance, interestRate, termMonths, startDate, dueDay, fees } = params;
  const monthlyRate = teaToMonthlyRate(interestRate);
  const feeTotal = totalMonthlyFees(fees);

  // Standard amortization payment (principal + interest only, fees added separately)
  let pmt: number;
  if (monthlyRate === 0) {
    pmt = balance / termMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    pmt = (balance * monthlyRate * factor) / (factor - 1);
  }

  const installments: InstallmentRow[] = [];
  let remaining = balance;

  for (let i = 1; i <= termMonths; i++) {
    const interestAmount = remaining * monthlyRate;
    const capitalAmount = Math.min(pmt - interestAmount, remaining);
    remaining = Math.max(remaining - capitalAmount, 0);

    const dueDate = buildDueDate(startDate, i, dueDay);
    const roundedCapital = Math.round(capitalAmount * 100) / 100;
    const roundedInterest = Math.round(interestAmount * 100) / 100;

    installments.push({
      installmentNumber: i,
      dueDate,
      capital: roundedCapital,
      interest: roundedInterest,
      fees: fees ?? [],
      totalAmount: Math.round((roundedCapital + roundedInterest + feeTotal) * 100) / 100,
    });
  }

  return installments;
}

/** Build a due date: start month + offset months, clamped to dueDay */
function buildDueDate(startDate: Date, monthOffset: number, dueDay: number): Date {
  const base = addMonths(startDate, monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  // Clamp dueDay to the last day of the month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(year, month, day);
}
