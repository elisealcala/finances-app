type StatementExpenseBalanceInput = {
  amount: number | { toString(): string };
  currency: string | null;
  paymentStatus: string;
};

export function calculateStatementBalances(
  expenses: StatementExpenseBalanceInput[],
  accountCurrency: string,
) {
  const totalsByCurrency: Record<string, number> = {};
  const outstandingByCurrency: Record<string, number> = {};

  for (const expense of expenses) {
    const currency = expense.currency ?? accountCurrency;
    const amount = Number(expense.amount);

    totalsByCurrency[currency] = (totalsByCurrency[currency] ?? 0) + amount;
    outstandingByCurrency[currency] ??= 0;

    if (expense.paymentStatus === "NOT_PAID") {
      outstandingByCurrency[currency] += amount;
    }
  }

  return { totalsByCurrency, outstandingByCurrency };
}
