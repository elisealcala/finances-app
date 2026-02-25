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

/** Compute balances split by currency.
 *  Primary currency includes opening + incomes + transfers.
 *  Expenses are grouped by their own currency (falling back to account currency).
 */
export async function computeAccountBalancesByCurrency(
  db: PrismaClient,
  accountId: string,
  accountCurrency: string,
  opening: number,
): Promise<Record<string, number>> {
  const [incomeAgg, expenses, transferInAgg, transferOutAgg] =
    await Promise.all([
      db.income.aggregate({
        where: { accountId },
        _sum: { amount: true },
      }),
      db.expense.findMany({
        where: { accountId },
        select: { amount: true, currency: true },
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
  const totalTransferIn = Number(transferInAgg._sum.amount ?? 0);
  const totalTransferOut = Number(transferOutAgg._sum.amount ?? 0);

  // Group expenses by currency
  const expenseByCurrency: Record<string, number> = {};
  for (const e of expenses) {
    const cur = e.currency ?? accountCurrency;
    expenseByCurrency[cur] = (expenseByCurrency[cur] ?? 0) + Number(e.amount);
  }

  const balances: Record<string, number> = {};

  // Primary currency: opening + incomes + transfers - same-currency expenses
  balances[accountCurrency] =
    opening +
    totalIncome +
    totalTransferIn -
    totalTransferOut -
    (expenseByCurrency[accountCurrency] ?? 0);

  // Secondary currencies: only negative expense totals
  for (const [cur, total] of Object.entries(expenseByCurrency)) {
    if (cur !== accountCurrency) {
      balances[cur] = -total;
    }
  }

  return balances;
}
