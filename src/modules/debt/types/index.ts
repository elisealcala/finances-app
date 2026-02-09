import type { Debt as PrismaDebt } from "@/generated/prisma/client";

/** Serialized Debt with Decimal fields converted to number for client use */
export type Debt = Omit<PrismaDebt, "balance" | "interestRate" | "minimumPayment"> & {
  balance: number;
  interestRate: number;
  minimumPayment: number;
};

export type DebtSummary = {
  totalDebt: number;
  totalMinimumPayment: number;
  averageInterestRate: number;
  activeCount: number;
  paidOffCount: number;
};

export { DebtType, DebtStatus } from "@/generated/prisma/client";
