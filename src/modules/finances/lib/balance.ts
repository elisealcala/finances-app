import type { PrismaClient } from "@/generated/prisma/client";

/** Compute the current balance for an account:
 *  opening + SUM(incomes) - SUM(expenses) + SUM(transfers_in) - SUM(transfers_out)
 */
export async function computeAccountBalance(
  db: PrismaClient,
  accountId: string,
  opening: number,
): Promise<number> {
  const [incomeAgg, expenseAgg, transferInAgg, transferOutAgg] =
    await Promise.all([
      db.income.aggregate({
        where: { accountId },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: { accountId },
        _sum: { amount: true },
      }),
      db.transfer.aggregate({
        where: { toAccountId: accountId },
        _sum: { amount: true },
      }),
      db.transfer.aggregate({
        where: { fromAccountId: accountId },
        _sum: { amount: true },
      }),
    ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);
  const totalTransferIn = Number(transferInAgg._sum.amount ?? 0);
  const totalTransferOut = Number(transferOutAgg._sum.amount ?? 0);

  return opening + totalIncome - totalExpense + totalTransferIn - totalTransferOut;
}
