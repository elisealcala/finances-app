import type { PrismaClient } from "@/generated/prisma/client";
import { computeAccountBalance } from "@/modules/finances/lib/balance";
import type { AvailableBalance, Obligation } from "../types";
import { getOccurrencesInRange } from "./upcoming";

/**
 * Compute available balance for a single account.
 * Available = balance - committed (upcoming expenses this month that haven't been paid yet).
 */
export async function computeAvailableBalance(
  db: PrismaClient,
  accountId: string,
  currentBalance: number,
  referenceDate: Date = new Date(),
): Promise<{ available: number; committed: number; obligations: Obligation[] }> {
  const monthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
  );
  const monthEnd = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
    23, 59, 59,
  );

  // 1. Get active recurring expenses for this account
  const recurringExpenses = await db.recurringTransaction.findMany({
    where: {
      accountId,
      isActive: true,
      type: "EXPENSE",
      startDate: { lte: monthEnd },
      OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
    },
  });

  const obligations: Obligation[] = [];

  for (const rt of recurringExpenses) {
    const occurrences = getOccurrencesInRange(
      rt.frequency,
      rt.dayOfMonth,
      rt.startDate,
      rt.endDate,
      referenceDate, // only future occurrences from today
      monthEnd,
    );
    for (const date of occurrences) {
      obligations.push({
        id: `recurring-${rt.id}-${date.toISOString()}`,
        name: rt.name,
        amount: Number(rt.amount),
        dueDate: date,
        accountId,
        source: "recurring",
        debtId: rt.debtId,
        isPaid: false,
      });
    }
  }

  // 2. Get funding links for this account → find linked debts' next payments
  const fundingLinks = await db.fundingLink.findMany({
    where: { sourceAccountId: accountId },
    include: {
      debt: {
        include: {
          installments: {
            where: {
              status: "PENDING",
              dueDate: { gte: referenceDate, lte: monthEnd },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  for (const fl of fundingLinks) {
    for (const inst of fl.debt.installments) {
      // Check if there's already a recurring transaction covering this debt
      const alreadyCovered = obligations.some(
        (o) => o.debtId === fl.debtId && o.source === "recurring",
      );
      if (!alreadyCovered) {
        obligations.push({
          id: `installment-${inst.id}`,
          name: `${fl.debt.name} #${inst.installmentNumber}`,
          amount: Number(inst.totalAmount),
          dueDate: inst.dueDate,
          accountId,
          source: "debt_installment",
          debtId: fl.debtId,
          isPaid: false,
        });
      }
    }
  }

  // 3. Check which obligations already have a matching expense this month (avoid double-counting)
  const existingExpenses = await db.expense.findMany({
    where: {
      accountId,
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  // Simple match: if an expense exists with a similar amount and name pattern
  for (const obligation of obligations) {
    const match = existingExpenses.find(
      (e) =>
        Math.abs(Number(e.amount) - obligation.amount) < 0.01 &&
        (e.name.toLowerCase().includes(obligation.name.toLowerCase().split(" ")[0]) ||
          obligation.name.toLowerCase().includes(e.name.toLowerCase().split(" ")[0])),
    );
    if (match) {
      obligation.isPaid = true;
    }
  }

  const committed = obligations
    .filter((o) => !o.isPaid)
    .reduce((sum, o) => sum + o.amount, 0);

  return {
    available: Math.round((currentBalance - committed) * 100) / 100,
    committed: Math.round(committed * 100) / 100,
    obligations,
  };
}

/**
 * Compute available balances for all active accounts.
 */
export async function computeAllAvailableBalances(
  db: PrismaClient,
  referenceDate: Date = new Date(),
): Promise<AvailableBalance[]> {
  const accounts = await db.account.findMany({
    where: { isArchived: false },
  });

  const results: AvailableBalance[] = [];

  for (const account of accounts) {
    const balance = await computeAccountBalance(
      db,
      account.id,
      Number(account.opening),
    );
    const { available, committed, obligations } = await computeAvailableBalance(
      db,
      account.id,
      balance,
      referenceDate,
    );

    results.push({
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      balance,
      available,
      committed,
      obligations,
    });
  }

  return results;
}
