import { format, addMonths, differenceInMonths } from "date-fns";
import type { Debt } from "../types";

/** Convert TEA (Tasa Efectiva Anual) percentage to a monthly interest rate */
export function teaToMonthlyRate(teaPercent: number): number {
  return Math.pow(1 + teaPercent / 100, 1 / 12) - 1;
}

/** Calculate remaining balance after k monthly payments using amortization formula:
 *  B × (1+r)^k - PMT × [(1+r)^k - 1] / r
 */
export function balanceAfterPayments(
  balance: number,
  monthlyRate: number,
  payment: number,
  months: number,
): number {
  if (monthlyRate === 0) return Math.max(balance - payment * months, 0);
  const factor = Math.pow(1 + monthlyRate, months);
  const result = balance * factor - payment * ((factor - 1) / monthlyRate);
  return Math.max(result, 0);
}

/** Reverse-compute the original balance at startedAt given the current balance now.
 *  B_0 = (B_now + PMT × [(1+r)^N - 1] / r) / (1+r)^N
 */
export function originalBalance(
  currentBalance: number,
  monthlyRate: number,
  payment: number,
  monthsElapsed: number,
): number {
  if (monthsElapsed <= 0) return currentBalance;
  if (monthlyRate === 0) return currentBalance + payment * monthsElapsed;
  const factor = Math.pow(1 + monthlyRate, monthsElapsed);
  return (currentBalance + payment * ((factor - 1) / monthlyRate)) / factor;
}

/** Calculate months until a debt is fully paid off:
 *  -log(1 - B×r/PMT) / log(1+r)
 */
export function monthsUntilPaidOff(
  balance: number,
  monthlyRate: number,
  payment: number,
): number {
  if (balance <= 0) return 0;
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  const ratio = (balance * monthlyRate) / payment;
  if (ratio >= 1) return Infinity; // payment doesn't cover interest
  return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + monthlyRate));
}

/** Calculate total interest paid over the life of the debt */
function totalInterestPaid(
  balance: number,
  monthlyRate: number,
  payment: number,
): number {
  let remaining = balance;
  let totalInterest = 0;
  while (remaining > 0.01) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    const principal = Math.min(payment - interest, remaining);
    remaining -= principal;
    if (payment <= interest) break;
  }
  return Math.round(totalInterest * 100) / 100;
}

export type TimelineRow = {
  monthLabel: string;
  date: string; // ISO date string for period filtering
  total: number;
  [debtName: string]: string | number;
};

/** Generate month-by-month balance projections for all debts,
 *  including backward projection from startedAt when available. */
export function generateTimeline(
  debts: Debt[],
  referenceDate: Date = new Date(),
): TimelineRow[] {
  if (debts.length === 0) return [];

  const now = referenceDate;

  // Pre-compute each debt's effective start, original balance, and total span
  const debtInfos = debts.map((debt) => {
    const rate = teaToMonthlyRate(debt.interestRate);
    const effectiveStart = debt.startedAt ? new Date(debt.startedAt) : now;
    const monthsElapsed = Math.max(0, differenceInMonths(now, effectiveStart));

    // Reverse-compute original balance if we have a start date in the past
    const origBal = debt.startedAt
      ? originalBalance(debt.balance, rate, debt.minimumPayment, monthsElapsed)
      : debt.balance;

    const monthsToPayoff = monthsUntilPaidOff(debt.balance, rate, debt.minimumPayment);
    const totalFromStart = monthsElapsed + monthsToPayoff;

    return { debt, rate, effectiveStart, originalBalance: origBal, totalFromStart };
  });

  // Timeline spans from earliest start to latest payoff
  const earliestStart = new Date(
    Math.min(...debtInfos.map((d) => d.effectiveStart.getTime())),
  );

  const maxTotalMonths = Math.max(
    ...debtInfos.map((d) => {
      const offset = differenceInMonths(d.effectiveStart, earliestStart);
      return offset + d.totalFromStart;
    }),
  );

  if (!isFinite(maxTotalMonths) || maxTotalMonths <= 0) return [];

  const capped = Math.min(maxTotalMonths, 240); // cap at 20 years
  const rows: TimelineRow[] = [];

  for (let k = 0; k <= capped; k++) {
    const date = addMonths(earliestStart, k);
    const row: TimelineRow = {
      monthLabel: format(date, "MMM yyyy"),
      date: date.toISOString(),
      total: 0,
    };

    for (const info of debtInfos) {
      const monthsSinceDebtStart = differenceInMonths(date, info.effectiveStart);

      let bal: number;
      if (monthsSinceDebtStart < 0) {
        // Debt hasn't started yet at this point
        bal = 0;
      } else {
        bal = balanceAfterPayments(
          info.originalBalance,
          info.rate,
          info.debt.minimumPayment,
          monthsSinceDebtStart,
        );
      }

      row[info.debt.name] = Math.round(bal * 100) / 100;
      row.total += bal;
    }

    row.total = Math.round(row.total * 100) / 100;
    rows.push(row);
  }

  return rows;
}

export type SimulationResult = {
  originalMonths: number;
  newMonths: number;
  monthsSaved: number;
  interestSaved: number;
  newBalance: number;
  originalProjection: { monthLabel: string; balance: number }[];
  newProjection: { monthLabel: string; balance: number }[];
};

/** Simulate a one-time extra capital payment on a specific debt */
export function simulateExtraPayment(
  debt: Debt,
  extraPayment: number,
  startDate: Date = new Date(),
): SimulationResult | null {
  if (extraPayment <= 0 || extraPayment >= debt.balance) return null;

  const rate = teaToMonthlyRate(debt.interestRate);
  const originalMonths = monthsUntilPaidOff(debt.balance, rate, debt.minimumPayment);
  const newBalance = Math.round((debt.balance - extraPayment) * 100) / 100;
  const newMonths = monthsUntilPaidOff(newBalance, rate, debt.minimumPayment);

  if (!isFinite(originalMonths)) return null;

  const originalInterest = totalInterestPaid(debt.balance, rate, debt.minimumPayment);
  const newInterest = totalInterestPaid(newBalance, rate, debt.minimumPayment);

  const maxM = Math.max(originalMonths, newMonths);
  const capped = Math.min(maxM, 120);

  const originalProjection: { monthLabel: string; balance: number }[] = [];
  const newProjection: { monthLabel: string; balance: number }[] = [];

  for (let k = 0; k <= capped; k++) {
    const date = addMonths(startDate, k);
    const label = format(date, "MMM yyyy");
    originalProjection.push({
      monthLabel: label,
      balance: Math.round(balanceAfterPayments(debt.balance, rate, debt.minimumPayment, k) * 100) / 100,
    });
    newProjection.push({
      monthLabel: label,
      balance: Math.round(balanceAfterPayments(newBalance, rate, debt.minimumPayment, k) * 100) / 100,
    });
  }

  return {
    originalMonths,
    newMonths,
    monthsSaved: originalMonths - newMonths,
    interestSaved: Math.round((originalInterest - newInterest) * 100) / 100,
    newBalance,
    originalProjection,
    newProjection,
  };
}
