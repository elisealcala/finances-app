import type {
  Debt as PrismaDebt,
  DebtPayment as PrismaDebtPayment,
  DebtInstallment as PrismaDebtInstallment,
} from "@/generated/prisma/client";

export type DebtFee = { name: string; amount: number };

/** Serialized DebtPayment with Decimal fields converted to number */
export type DebtPayment = Omit<
  PrismaDebtPayment,
  "amount" | "newMinimumPayment" | "newMonthlyCapital" | "newMonthlyInterest" | "newFees"
> & {
  amount: number;
  newMonthlyCapital: number | null;
  newMonthlyInterest: number | null;
  newMinimumPayment: number | null;
  newFees: DebtFee[] | null;
};

/** Serialized DebtInstallment with Decimal fields converted to number */
export type DebtInstallment = Omit<
  PrismaDebtInstallment,
  "capital" | "interest" | "totalAmount" | "fees"
> & {
  capital: number;
  interest: number;
  totalAmount: number;
  fees: DebtFee[];
};

/** Serialized Debt with Decimal fields converted to number for client use */
export type Debt = Omit<
  PrismaDebt,
  | "balance"
  | "originalBalance"
  | "interestRate"
  | "monthlyCapital"
  | "monthlyInterest"
  | "originalMonthlyCapital"
  | "originalMonthlyInterest"
  | "minimumPayment"
  | "originalMinimumPayment"
  | "fees"
> & {
  balance: number;
  originalBalance: number;
  interestRate: number;
  monthlyCapital: number;
  monthlyInterest: number;
  originalMonthlyCapital: number;
  originalMonthlyInterest: number;
  minimumPayment: number;
  originalMinimumPayment: number;
  fees: DebtFee[];
  payments: DebtPayment[];
  installments?: DebtInstallment[];
};

export type DebtSummary = {
  totalDebt: number;
  totalMinimumPayment: number;
  averageInterestRate: number;
  activeCount: number;
  paidOffCount: number;
};

export { DebtType, DebtStatus, InstallmentStatus } from "@/generated/prisma/client";
