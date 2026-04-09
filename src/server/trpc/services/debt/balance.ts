import { Prisma } from "@/generated/prisma/client";
import type {
  Debt,
  DebtPayment,
  DebtInstallment,
} from "@/generated/prisma/client";
import { computeCurrentBalance, totalMonthlyFees } from "./amortization";
import type { DebtFee } from "@/types/debt";

type DebtWithPayments = Debt & {
  payments: DebtPayment[];
  installments?: DebtInstallment[];
};

/** Convert Prisma Decimal fields to plain numbers for client serialization */
export function serializeDebt(debt: DebtWithPayments) {
  const fees = parseFees(debt.fees);
  return {
    ...debt,
    balance: Number(debt.balance),
    originalBalance: Number(debt.originalBalance),
    interestRate: Number(debt.interestRate),
    monthlyCapital: Number(debt.monthlyCapital),
    monthlyInterest: Number(debt.monthlyInterest),
    originalMonthlyCapital: Number(debt.originalMonthlyCapital),
    originalMonthlyInterest: Number(debt.originalMonthlyInterest),
    minimumPayment: Number(debt.minimumPayment),
    originalMinimumPayment: Number(debt.originalMinimumPayment),
    fees,
    payments: debt.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      newMonthlyCapital: p.newMonthlyCapital
        ? Number(p.newMonthlyCapital)
        : null,
      newMonthlyInterest: p.newMonthlyInterest
        ? Number(p.newMonthlyInterest)
        : null,
      newMinimumPayment: p.newMinimumPayment
        ? Number(p.newMinimumPayment)
        : null,
      newFees: parseFees(p.newFees),
    })),
    installments: (debt.installments ?? []).map(serializeInstallment),
  };
}

/** Convert a Prisma DebtInstallment to plain numbers */
export function serializeInstallment(inst: DebtInstallment) {
  return {
    ...inst,
    capital: Number(inst.capital),
    interest: Number(inst.interest),
    totalAmount: Number(inst.totalAmount),
    fees: parseFees(inst.fees),
  };
}

/** Compute remaining balance from a schedule: sum of capital for PENDING installments */
export function computeScheduleBalance(
  installments: { capital: Prisma.Decimal | number; status: string }[],
): number {
  const remaining = installments
    .filter((i) => i.status === "PENDING")
    .reduce((sum, i) => sum + Number(i.capital), 0);
  return Math.round(remaining * 100) / 100;
}

/** Convert Prisma payment records to the shape computeCurrentBalance expects */
export function serializePaymentsForCalc(payments: DebtPayment[]) {
  return payments.map((p) => ({
    amount: Number(p.amount),
    date: p.date,
    newMinimumPayment: p.newMinimumPayment
      ? Number(p.newMinimumPayment)
      : null,
    newFeeTotal: p.newFees
      ? totalMonthlyFees(parseFees(p.newFees))
      : null,
  }));
}

/** Recompute current balance from original values + all payments + fees */
export function recomputeBalance(
  debt: {
    originalBalance: Prisma.Decimal;
    interestRate: Prisma.Decimal;
    originalMinimumPayment: Prisma.Decimal;
    startedAt: Date | null;
    fees: unknown;
  },
  payments: DebtPayment[],
): number {
  return computeCurrentBalance(
    Number(debt.originalBalance),
    Number(debt.interestRate),
    Number(debt.originalMinimumPayment),
    debt.startedAt,
    serializePaymentsForCalc(payments),
    parseFees(debt.fees),
  );
}

/** Walk payments chronologically to derive the current payment breakdown + fees */
export function deriveCurrentBreakdown(
  originalCapital: number,
  originalInterest: number,
  originalFees: DebtFee[],
  payments: DebtPayment[],
): { capital: number; interest: number; fees: DebtFee[] } {
  const sorted = [...payments].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  let capital = originalCapital;
  let interest = originalInterest;
  let fees = originalFees;
  for (const p of sorted) {
    if (p.newMonthlyCapital != null && p.newMonthlyInterest != null) {
      capital = Number(p.newMonthlyCapital);
      interest = Number(p.newMonthlyInterest);
    }
    if (p.newFees) {
      fees = parseFees(p.newFees);
    }
  }
  return { capital, interest, fees };
}

/** Parse the JSON fees field into a typed array, defaulting to [] */
export function parseFees(fees: unknown): DebtFee[] {
  if (!fees || !Array.isArray(fees)) return [];
  return fees as DebtFee[];
}
