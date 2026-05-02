import { format, addMonths, differenceInMonths, differenceInCalendarMonths } from "date-fns";
import type { Debt, DebtFee } from "@/types/debt";

/** Sum all monthly fee amounts. Returns 0 if no fees. */
export function totalMonthlyFees(fees: DebtFee[] | null | undefined): number {
  if (!fees?.length) return 0;
  return fees.reduce((sum, f) => sum + f.amount, 0);
}

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

/** Compute the current balance accounting for amortization + capital payments at their dates.
 *  Walks the timeline segment by segment, applying minimumPayment amortization between
 *  capital payments, then subtracting the capital payment amount.
 *  Fees are subtracted from the installment so only the capital+interest portion amortizes.
 *  Falls back to simple subtraction if no startDate is provided. */
export function computeCurrentBalance(
  origBalance: number,
  interestRate: number,
  minimumPayment: number,
  startDate: Date | null,
  capitalPayments: { amount: number; date: Date; newMinimumPayment?: number | null; newFeeTotal?: number | null }[],
  fees: DebtFee[] | null | undefined = [],
  referenceDate: Date = new Date(),
): number {
  if (!startDate) {
    const totalPaid = capitalPayments.reduce((s, p) => s + p.amount, 0);
    return Math.max(Math.round((origBalance - totalPaid) * 100) / 100, 0);
  }

  const monthlyRate = teaToMonthlyRate(interestRate);
  let currentFeeTotal = totalMonthlyFees(fees);
  const sorted = [...capitalPayments].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  let balance = origBalance;
  let checkpoint = startDate;
  let activePayment = minimumPayment - currentFeeTotal;

  for (const payment of sorted) {
    if (payment.date <= startDate) {
      if (payment.newFeeTotal != null) {
        currentFeeTotal = payment.newFeeTotal;
      }
      if (payment.newMinimumPayment != null && payment.newMinimumPayment > 0) {
        activePayment = payment.newMinimumPayment - currentFeeTotal;
      }
      continue;
    }
    if (payment.date > referenceDate) break;

    const months = differenceInMonths(payment.date, checkpoint);
    if (months > 0) {
      balance = balanceAfterPayments(balance, monthlyRate, activePayment, months);
    }
    balance = Math.max(balance - payment.amount, 0);

    // Update fee total if this payment changed fees
    if (payment.newFeeTotal != null) {
      currentFeeTotal = payment.newFeeTotal;
    }

    // If this capital payment changed the monthly installment, switch
    if (payment.newMinimumPayment != null && payment.newMinimumPayment > 0) {
      activePayment = payment.newMinimumPayment - currentFeeTotal;
    }

    checkpoint = payment.date;
  }

  const remainingMonths = differenceInMonths(referenceDate, checkpoint);
  if (remainingMonths > 0) {
    balance = balanceAfterPayments(balance, monthlyRate, activePayment, remainingMonths);
  }

  return Math.max(Math.round(balance * 100) / 100, 0);
}

export type TimelineRow = {
  monthLabel: string;
  date: string; // ISO date string for period filtering
  total: number;
  [debtName: string]: string | number;
};

export type PaymentMarker = {
  monthLabel: string;
  debtName: string;
  amount: number;
};

/** Generate month-by-month balance projections for all debts,
 *  accounting for capital payments at their actual dates.
 *  Returns both the timeline rows and payment markers for the chart. */
export function generateTimeline(
  debts: Debt[],
  referenceDate: Date = new Date(),
): { rows: TimelineRow[]; paymentMarkers: PaymentMarker[] } {
  if (debts.length === 0) return { rows: [], paymentMarkers: [] };

  const now = referenceDate;
  const paymentMarkers: PaymentMarker[] = [];

  // Pre-compute each debt's info
  const debtInfos = debts.map((debt) => {
    const rate = teaToMonthlyRate(debt.interestRate);
    const feeTotal = totalMonthlyFees(debt.fees);
    const effPayment = debt.minimumPayment - feeTotal;
    // For timeline display, the debt "starts" on its first installment.
    // Prefer the actual first installment's due date when a schedule exists;
    // otherwise fall back to one month after startedAt (the form's convention
    // that the first payment is the month after the loan was opened).
    const firstInstallmentDate = debt.installments?.[0]?.dueDate
      ? new Date(debt.installments[0].dueDate)
      : null;
    const effectiveStart = firstInstallmentDate
      ? firstInstallmentDate
      : debt.startedAt
        ? addMonths(new Date(debt.startedAt), 1)
        : now;

    // Use originalBalance from the debt when available, otherwise reverse-compute
    const hasPayments = debt.payments && debt.payments.length > 0;
    const origBal = hasPayments
      ? debt.originalBalance
      : debt.startedAt
        ? originalBalance(
            debt.balance,
            rate,
            effPayment,
            Math.max(0, differenceInMonths(now, effectiveStart)),
          )
        : debt.balance;

    // Build a map of capital payments by month label for quick lookup
    const paymentsByMonth = new Map<string, { capitalAmount: number; newMinimumPayment: number | null }>();
    for (const p of debt.payments ?? []) {
      const label = format(new Date(p.date), "MMM yyyy");
      const existing = paymentsByMonth.get(label);
      paymentsByMonth.set(label, {
        capitalAmount: (existing?.capitalAmount ?? 0) + p.amount,
        newMinimumPayment: p.newMinimumPayment ?? existing?.newMinimumPayment ?? null,
      });
      paymentMarkers.push({ monthLabel: label, debtName: debt.name, amount: p.amount });
    }

    const monthsToPayoff = monthsUntilPaidOff(debt.balance, rate, effPayment);
    const monthsElapsed = Math.max(0, differenceInMonths(now, effectiveStart));
    const totalFromStart = monthsElapsed + monthsToPayoff;

    return { debt, rate, feeTotal, effectiveStart, originalBalance: origBal, totalFromStart, paymentsByMonth };
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

  if (maxTotalMonths <= 0) return { rows: [], paymentMarkers };

  const capped = Math.min(maxTotalMonths, 240); // cap at 20 years
  const rows: TimelineRow[] = [];
  const nowLabel = format(now, "MMM yyyy");

  // Track running balances per debt for iterative month-by-month calculation
  const runningBalances = debtInfos.map((info) => ({
    balance: info.originalBalance,
    started: false,
    activePayment: info.debt.minimumPayment - info.feeTotal,
  }));

  for (let k = 0; k <= capped; k++) {
    const date = addMonths(earliestStart, k);
    const monthLabel = format(date, "MMM yyyy");
    const row: TimelineRow = {
      monthLabel,
      date: date.toISOString(),
      total: 0,
    };

    for (let i = 0; i < debtInfos.length; i++) {
      const info = debtInfos[i];
      const running = runningBalances[i];
      const monthsSinceDebtStart = differenceInCalendarMonths(date, info.effectiveStart);

      if (monthsSinceDebtStart < 0) {
        row[info.debt.id] = 0;
        continue;
      }

      // At the current month, snap to actual stored balance so the chart
      // matches the debt detail view and Total Debt card exactly.
      if (monthLabel === nowLabel) {
        running.balance = info.debt.balance;
        running.activePayment = info.debt.minimumPayment - info.feeTotal;
      } else if (!running.started) {
        // First month of this debt — use original balance
        running.started = true;
        running.balance = info.originalBalance;
      } else if (running.balance > 0) {
        // Apply one month of amortization
        const interest = running.balance * info.rate;
        const principal = Math.min(
          running.activePayment - interest,
          running.balance,
        );
        if (running.activePayment > interest) {
          running.balance -= principal;
        }
      }

      // Apply any capital payments in this month
      const monthData = info.paymentsByMonth.get(monthLabel);
      if (monthData) {
        if (monthData.capitalAmount > 0) {
          running.balance = Math.max(running.balance - monthData.capitalAmount, 0);
        }
        if (monthData.newMinimumPayment != null) {
          running.activePayment = monthData.newMinimumPayment - info.feeTotal;
        }
      }

      const bal = Math.max(Math.round(running.balance * 100) / 100, 0);
      row[info.debt.id] = bal;
      row[`${info.debt.id}_monthly`] = bal > 0 ? Math.round((running.activePayment + info.feeTotal) * 100) / 100 : 0;
      row.total += bal;
    }

    row.total = Math.round(row.total * 100) / 100;
    rows.push(row);
  }

  return { rows, paymentMarkers };
}

/** Generate timeline rows from installment schedule data (for scheduled debts).
 *  Returns a simple month-by-month balance projection based on installment capital. */
export function generateScheduleTimeline(
  debtName: string,
  installments: Array<{
    dueDate: Date | string;
    capital: number;
    status: string;
  }>,
  originalBalance: number,
): TimelineRow[] {
  if (installments.length === 0) return [];

  const rows: TimelineRow[] = [];
  let balance = originalBalance;

  for (const inst of installments) {
    const date = typeof inst.dueDate === "string" ? new Date(inst.dueDate) : inst.dueDate;
    const monthLabel = format(date, "MMM yyyy");

    if (inst.status === "PAID") {
      balance = Math.max(balance - inst.capital, 0);
    }

    const rounded = Math.round(balance * 100) / 100;
    rows.push({
      monthLabel,
      date: date.toISOString(),
      total: rounded,
      [debtName]: rounded,
    });

    if (inst.status === "PENDING") {
      balance = Math.max(balance - inst.capital, 0);
    }
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
  const effPayment = debt.minimumPayment - totalMonthlyFees(debt.fees);
  const originalMonths = monthsUntilPaidOff(debt.balance, rate, effPayment);
  const newBalance = Math.round((debt.balance - extraPayment) * 100) / 100;
  const newMonths = monthsUntilPaidOff(newBalance, rate, effPayment);

  if (!isFinite(originalMonths)) return null;

  const originalInterest = totalInterestPaid(debt.balance, rate, effPayment);
  const newInterest = totalInterestPaid(newBalance, rate, effPayment);

  const maxM = Math.max(originalMonths, newMonths);
  const capped = Math.min(maxM, 120);

  const originalProjection: { monthLabel: string; balance: number }[] = [];
  const newProjection: { monthLabel: string; balance: number }[] = [];

  for (let k = 0; k <= capped; k++) {
    const date = addMonths(startDate, k);
    const label = format(date, "MMM yyyy");
    originalProjection.push({
      monthLabel: label,
      balance: Math.round(balanceAfterPayments(debt.balance, rate, effPayment, k) * 100) / 100,
    });
    newProjection.push({
      monthLabel: label,
      balance: Math.round(balanceAfterPayments(newBalance, rate, effPayment, k) * 100) / 100,
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
