import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

export type CreateExpenseInput = {
  name: string;
  amount: number;
  date: Date;
  paymentStatus?: "PAID" | "NOT_PAID";
  currency?: "PEN" | "USD" | "EUR" | null;
  notes?: string | null;
  accountId: string;
  categoryId?: string | null;
  payingAccountId?: string | null;
  paymentDueDate?: Date | null;
  statementId?: string | null;
};

const EXPENSE_INCLUDE = {
  account: { select: { id: true, name: true, currency: true, type: true, color: true } },
  category: { select: { id: true, name: true, color: true, icon: true, monthlyBudget: true } },
  payingAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
} as const;

export async function createExpenseInternal(
  db: PrismaClient,
  input: CreateExpenseInput,
) {
  let paymentStatus = input.paymentStatus ?? "PAID";
  const account = await db.account.findUnique({
    where: { id: input.accountId },
    select: { type: true, currency: true, defaultPayingAccountId: true },
  });

  if (paymentStatus === "PAID" && account?.type === "CREDIT_CARD") {
    paymentStatus = "NOT_PAID";
  }

  const payingAccountId =
    input.payingAccountId ??
    (account?.type === "CREDIT_CARD" ? account.defaultPayingAccountId : null);

  let paymentDueDate = input.paymentDueDate ?? null;
  if (input.statementId && !paymentDueDate) {
    const statement = await db.creditCardStatement.findUnique({
      where: { id: input.statementId },
      select: { paymentDueDate: true },
    });
    if (statement) paymentDueDate = statement.paymentDueDate;
  }

  return db.expense.create({
    data: {
      name: input.name,
      amount: new Prisma.Decimal(input.amount),
      date: input.date,
      paymentStatus,
      currency: input.currency ?? null,
      notes: input.notes ?? null,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      payingAccountId,
      paymentDueDate,
      statementId: input.statementId ?? null,
    },
    include: EXPENSE_INCLUDE,
  });
}
