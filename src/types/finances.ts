import type {
  Account as PrismaAccount,
  Category as PrismaCategory,
  Expense as PrismaExpense,
  Income as PrismaIncome,
  Transfer as PrismaTransfer,
  CreditCardStatement as PrismaCreditCardStatement,
} from "@/generated/prisma/client";

export {
  AccountType,
  PaymentStatus,
  Currency,
  StatementStatus,
} from "@/generated/prisma/client";

/** Serialized Account with Decimal fields converted to number */
export type Account = Omit<
  PrismaAccount,
  "opening" | "creditLimit" | "apr"
> & {
  opening: number;
  creditLimit: number | null;
  apr: number | null;
};

/** Account with computed balance */
export type AccountWithBalance = Account & {
  balance: number;
  balancesByCurrency?: Record<string, number>;
};

/** Serialized Category with Decimal fields converted to number */
export type Category = Omit<PrismaCategory, "monthlyBudget"> & {
  monthlyBudget: number | null;
};

/** Serialized Expense with Decimal fields converted to number */
export type Expense = Omit<PrismaExpense, "amount"> & {
  amount: number;
  account?: Account;
  category?: Category | null;
  payingAccount?: Account | null;
  statement?: CreditCardStatement | null;
};

/** Serialized Income with Decimal fields converted to number */
export type Income = Omit<PrismaIncome, "amount"> & {
  amount: number;
  account?: Account;
  category?: Category | null;
};

/** Serialized Transfer with Decimal fields converted to number */
export type Transfer = Omit<PrismaTransfer, "amount"> & {
  amount: number;
  fromAccount?: Account;
  toAccount?: Account;
};

export type PeriodSummary = {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number;
  topCategories: { name: string; amount: number; color: string | null }[];
};

export type MonthlySummaryItem = {
  month: number;
  income: number;
  expenses: number;
  savings: number;
};

/** Serialized CreditCardStatement with Decimal fields converted to number */
export type CreditCardStatement = Omit<
  PrismaCreditCardStatement,
  "totalAmount"
> & {
  totalAmount: number | null;
};

/** CreditCardStatement with linked expenses and account */
export type CreditCardStatementWithExpenses = CreditCardStatement & {
  expenses: Expense[];
  account?: Account;
};

export type BudgetStatus = {
  categoryId: string;
  categoryName: string;
  color: string | null;
  budget: number;
  grossSpent: number;
  categoryIncome: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isArchived: boolean;
};
