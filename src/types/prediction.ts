import type {
  RecurringFrequency,
  RecurringType,
} from "@/generated/prisma/client";

export type { RecurringFrequency, RecurringType } from "@/generated/prisma/client";

export type RecurringTransaction = {
  id: string;
  name: string;
  amount: number;
  type: RecurringType;
  frequency: RecurringFrequency;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  accountId: string;
  categoryId: string | null;
  debtId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FundingLink = {
  id: string;
  sourceAccountId: string;
  debtId: string;
  notes: string | null;
  createdAt: Date;
};

export type Obligation = {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  accountId: string;
  source: "recurring" | "debt_installment";
  debtId?: string | null;
  isPaid: boolean;
};

export type AvailableBalance = {
  accountId: string;
  accountName: string;
  currency: string;
  balance: number;
  available: number;
  committed: number;
  obligations: Obligation[];
};

export type CashFlowMonth = {
  month: string; // "2026-03"
  label: string; // "Mar 2026"
  accounts: Record<
    string,
    {
      accountId: string;
      accountName: string;
      balance: number;
      income: number;
      expenses: number;
      debtPayments: number;
    }
  >;
  totalBalance: number;
};

export type AlertSeverity = "critical" | "warning" | "info";

export type FinancialAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  accountId?: string;
  debtId?: string;
};

export type SpendingRoom = {
  accountId: string;
  accountName: string;
  currency: string;
  balance: number;
  committed: number;
  room: number;
};
