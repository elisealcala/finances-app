import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

/**
 * Record an expense when a debt installment is marked as paid,
 * if the debt has a funding link to an account.
 */
export async function recordDebtPaymentExpense(
  db: PrismaClient,
  debtName: string,
  installmentNumber: number,
  amount: number,
  date: Date,
  accountId: string,
) {
  await db.expense.create({
    data: {
      name: `Debt: ${debtName} #${installmentNumber}`,
      amount: new Prisma.Decimal(amount),
      date,
      paymentStatus: "PAID",
      accountId,
    },
  });
}

/**
 * Record an expense when a free-form debt payment is made,
 * if the debt has a funding link to an account.
 */
export async function recordDebtFreePaymentExpense(
  db: PrismaClient,
  debtName: string,
  amount: number,
  date: Date,
  accountId: string,
) {
  await db.expense.create({
    data: {
      name: `Debt payment: ${debtName}`,
      amount: new Prisma.Decimal(amount),
      date,
      paymentStatus: "PAID",
      accountId,
    },
  });
}
