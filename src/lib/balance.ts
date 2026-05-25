import type { PrismaClient, AccountType } from "@/generated/prisma/client";

/**
 * Transfer convention used by both balance functions:
 * - `amount` is always denominated in `fromAccount.currency`.
 * - For same-currency transfers, `transfer.currency` and `transfer.rate` are
 *   both null.
 * - For cross-currency transfers (e.g. USD → PEN):
 *     `transfer.currency` = fromAccount.currency (the source)
 *     `transfer.rate`     = exchange rate
 *     destination amount  = amount × rate, in toAccount.currency
 *
 * Outgoing leg (the FROM account is `accountId`):
 *   debit `amount` in accountCurrency (always — source currency matches).
 *
 * Incoming leg (the TO account is `accountId`):
 *   if cross-currency  → credit `amount × rate` in accountCurrency
 *   if same-currency   → credit `amount` in accountCurrency
 *
 * Legacy rows (cross-currency rows missing `rate`) fall back to the raw amount
 * so historical balances don't shift retroactively.
 */
function isCrossCurrencyTransfer(
  t: { currency: string | null; rate: unknown },
  accountCurrency: string,
): boolean {
  return t.currency != null && t.currency !== accountCurrency && t.rate != null;
}

/** Compute the current balance for an account:
 *  For credit cards: opening - SUM(NOT_PAID expenses)
 *  For other accounts: opening + SUM(incomes) - SUM(expenses) + SUM(transfers_in) - SUM(transfers_out)
 *  Cross-currency transfers landing in this account are converted via `rate`.
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

  const [account, incomeAgg, expenseAgg, transfersIn, transfersOut] =
    await Promise.all([
      db.account.findUnique({
        where: { id: accountId },
        select: { currency: true },
      }),
      db.income.aggregate({
        where: { accountId },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: { accountId },
        _sum: { amount: true },
      }),
      db.transfer.findMany({
        where: { toAccountId: accountId },
        select: { amount: true, currency: true, rate: true },
      }),
      db.transfer.findMany({
        where: { fromAccountId: accountId },
        select: { amount: true },
      }),
    ]);

  const accountCurrency = account?.currency ?? "PEN";
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpense = Number(expenseAgg._sum.amount ?? 0);

  const totalTransferIn = transfersIn.reduce((sum, t) => {
    if (isCrossCurrencyTransfer(t, accountCurrency)) {
      return sum + Number(t.amount) * Number(t.rate);
    }
    return sum + Number(t.amount);
  }, 0);
  const totalTransferOut = transfersOut.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );

  return opening + totalIncome - totalExpense + totalTransferIn - totalTransferOut;
}

/** Compute balances split by currency.
 *  For credit cards: only NOT_PAID expenses (no transfers needed).
 *  For other accounts: opening + incomes + transfers - expenses, grouped by currency.
 *  Cross-currency transfers landing in this account are converted into
 *  `accountCurrency` via `rate`. Cross-currency expenses (e.g. a USD purchase
 *  on a PEN card) are still tracked under their own currency bucket — that's
 *  the credit-card "secondary balance" view.
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
        select: { amount: true, currency: true, rate: true },
      }),
      db.transfer.findMany({
        where: { fromAccountId: accountId },
        select: { amount: true },
      }),
    ]);

  const totalIncome = Number(incomeAgg._sum.amount ?? 0);

  // Group expenses by currency (kept for credit-card-style multi-currency view)
  const expenseByCurrency: Record<string, number> = {};
  for (const e of expenses) {
    const cur = e.currency ?? accountCurrency;
    expenseByCurrency[cur] = (expenseByCurrency[cur] ?? 0) + Number(e.amount);
  }

  // Transfers always normalize to accountCurrency:
  // - outgoing: amount is in fromAccount.currency = accountCurrency.
  // - incoming: convert via rate when cross-currency.
  const transferInTotal = transfersIn.reduce((sum, t) => {
    if (isCrossCurrencyTransfer(t, accountCurrency)) {
      return sum + Number(t.amount) * Number(t.rate);
    }
    return sum + Number(t.amount);
  }, 0);
  const transferOutTotal = transfersOut.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );

  // Collect all currencies appearing in expenses (transfers always normalize
  // into accountCurrency, so they no longer create secondary buckets).
  const allCurrencies = new Set<string>([accountCurrency]);
  for (const cur of Object.keys(expenseByCurrency)) allCurrencies.add(cur);

  const balances: Record<string, number> = {};

  // Primary currency: opening + incomes + transfers - expenses
  balances[accountCurrency] =
    opening +
    totalIncome +
    transferInTotal -
    transferOutTotal -
    (expenseByCurrency[accountCurrency] ?? 0);

  // Secondary currencies (mixed-currency expenses on credit-card-style flows):
  for (const cur of allCurrencies) {
    if (cur !== accountCurrency) {
      balances[cur] = -(expenseByCurrency[cur] ?? 0);
    }
  }

  return balances;
}
