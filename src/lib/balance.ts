import type { PrismaClient, AccountType } from "@/generated/prisma/client";

/** Compute the current balance for an account:
 *  For credit cards: opening - SUM(NOT_PAID expenses)
 *  For other accounts: opening + SUM(incomes) - SUM(expenses) + SUM(transfers_in) - SUM(transfers_out)
 */
export async function computeAccountBalance(
  db: PrismaClient,
  accountId: string,
  opening: number,
  accountType: AccountType,
): Promise<number> {
  if (accountType === "CREDIT_CARD") {
    const expenseAgg = await db.expense.aggregate({
      where: { accountId, paymentStatus: "NOT_PAID" },
      _sum: { amount: true },
    });
    return opening - Number(expenseAgg._sum.amount ?? 0);
  }

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
 *  For credit cards: only NOT_PAID expenses (no transfers needed).
 *  For other accounts: opening + incomes + transfers - expenses, grouped by currency.
 */
export async function computeAccountBalancesByCurrency(
  db: PrismaClient,
  accountId: string,
  accountCurrency: string,
  opening: number,
  accountType: AccountType,
): Promise<Record<string, number>> {
  if (accountType === "CREDIT_CARD") {
    const expenses = await db.expense.findMany({
      where: { accountId, paymentStatus: "NOT_PAID" },
      select: { amount: true, currency: true },
    });

    const expenseByCurrency: Record<string, number> = {};
    for (const e of expenses) {
      const cur = e.currency ?? accountCurrency;
      expenseByCurrency[cur] = (expenseByCurrency[cur] ?? 0) + Number(e.amount);
    }

    const balances: Record<string, number> = {};
    balances[accountCurrency] = opening - (expenseByCurrency[accountCurrency] ?? 0);

    for (const [cur, total] of Object.entries(expenseByCurrency)) {
      if (cur !== accountCurrency) {
        balances[cur] = -total;
      }
    }

    return balances;
  }

  const [incomeAgg, expenses, transfersIn, transfersOut] =
    await Promise.all([
      db.income.aggregate({
        where: { accountId },
        _sum: { amount: true },
      }),
      db.expense.findMany({
        where: { accountId },
        select: { amount: true, currency: true },
      }),
      db.transfer.findMany({
        where: { toAccountId: accountId },
        select: { amount: true, currency: true },
      }),
      db.transfer.findMany({
        where: { fromAccountId: accountId },
        select: { amount: true, currency: true },
      }),
    ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);

  // Group expenses by currency
  const expenseByCurrency: Record<string, number> = {};
  for (const e of expenses) {
    const cur = e.currency ?? accountCurrency;
    expenseByCurrency[cur] = (expenseByCurrency[cur] ?? 0) + Number(e.amount);
  }

  // Group transfers by currency
  const transferInByCurrency: Record<string, number> = {};
  for (const t of transfersIn) {
    const cur = t.currency ?? accountCurrency;
    transferInByCurrency[cur] = (transferInByCurrency[cur] ?? 0) + Number(t.amount);
  }

  const transferOutByCurrency: Record<string, number> = {};
  for (const t of transfersOut) {
    const cur = t.currency ?? accountCurrency;
    transferOutByCurrency[cur] = (transferOutByCurrency[cur] ?? 0) + Number(t.amount);
  }

  // Collect all currencies involved
  const allCurrencies = new Set<string>([accountCurrency]);
  for (const cur of Object.keys(expenseByCurrency)) allCurrencies.add(cur);
  for (const cur of Object.keys(transferInByCurrency)) allCurrencies.add(cur);
  for (const cur of Object.keys(transferOutByCurrency)) allCurrencies.add(cur);

  const balances: Record<string, number> = {};

  // Primary currency: opening + incomes + transfers - expenses
  balances[accountCurrency] =
    opening +
    totalIncome +
    (transferInByCurrency[accountCurrency] ?? 0) -
    (transferOutByCurrency[accountCurrency] ?? 0) -
    (expenseByCurrency[accountCurrency] ?? 0);

  // Secondary currencies: transfers in - transfers out - expenses
  for (const cur of allCurrencies) {
    if (cur !== accountCurrency) {
      balances[cur] =
        (transferInByCurrency[cur] ?? 0) -
        (transferOutByCurrency[cur] ?? 0) -
        (expenseByCurrency[cur] ?? 0);
    }
  }

  return balances;
}
