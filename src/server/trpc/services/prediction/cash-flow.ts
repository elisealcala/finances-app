import type { PrismaClient } from "@/generated/prisma/client";
import { computeAccountBalance } from "@/lib/balance";
import type { CashFlowMonth } from "@/types/prediction";
import { getOccurrencesInRange } from "./upcoming";

/**
 * Project cash flow for all accounts over N months.
 */
export async function projectCashFlow(
  db: PrismaClient,
  months: number = 6,
  referenceDate: Date = new Date(),
): Promise<CashFlowMonth[]> {
  // Load accounts
  const accounts = await db.account.findMany({
    where: { isArchived: false },
  });

  // Compute current balances
  const balances = new Map<string, number>();
  for (const account of accounts) {
    const balance = await computeAccountBalance(
      db,
      account.id,
      Number(account.opening),
    );
    balances.set(account.id, balance);
  }

  // Load recurring transactions
  const recurring = await db.recurringTransaction.findMany({
    where: { isActive: true },
  });

  // Load funding links with debt installments
  const fundingLinks = await db.fundingLink.findMany({
    include: {
      debt: {
        include: {
          installments: {
            where: { status: "PENDING" },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  // Build monthly projections
  const projection: CashFlowMonth[] = [];

  for (let m = 0; m < months; m++) {
    const monthDate = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + m,
      1,
    );
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23, 59, 59,
    );

    const monthLabel = monthDate.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    const accountData: CashFlowMonth["accounts"] = {};

    for (const account of accounts) {
      const currentBalance = balances.get(account.id) ?? 0;
      let income = 0;
      let expenses = 0;
      let debtPayments = 0;

      // Recurring incomes
      for (const rt of recurring) {
        if (rt.accountId !== account.id) continue;

        const occurrences = getOccurrencesInRange(
          rt.frequency,
          rt.dayOfMonth,
          rt.startDate,
          rt.endDate,
          monthStart,
          monthEnd,
        );

        const amount = Number(rt.amount) * occurrences.length;
        if (rt.type === "INCOME") {
          income += amount;
        } else {
          if (rt.debtId) {
            debtPayments += amount;
          } else {
            expenses += amount;
          }
        }
      }

      // Debt installments from funding links
      for (const fl of fundingLinks) {
        if (fl.sourceAccountId !== account.id) continue;

        // Check if already covered by a recurring transaction
        const hasRecurring = recurring.some(
          (rt) => rt.debtId === fl.debtId && rt.accountId === account.id,
        );
        if (hasRecurring) continue;

        for (const inst of fl.debt.installments) {
          if (inst.dueDate >= monthStart && inst.dueDate <= monthEnd) {
            debtPayments += Number(inst.totalAmount);
          }
        }
      }

      const newBalance = currentBalance + income - expenses - debtPayments;
      balances.set(account.id, newBalance);

      accountData[account.id] = {
        accountId: account.id,
        accountName: account.name,
        balance: Math.round(newBalance * 100) / 100,
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        debtPayments: Math.round(debtPayments * 100) / 100,
      };
    }

    const totalBalance = Object.values(accountData).reduce(
      (sum, a) => sum + a.balance,
      0,
    );

    projection.push({
      month: monthKey,
      label: monthLabel,
      accounts: accountData,
      totalBalance: Math.round(totalBalance * 100) / 100,
    });
  }

  return projection;
}
