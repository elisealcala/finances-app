import type { AccountWithBalance } from "@/types/finances";

export const ACCOUNT_BALANCE_CURRENCIES = ["PEN", "USD", "EUR"] as const;

export type AccountBalanceCurrency =
  (typeof ACCOUNT_BALANCE_CURRENCIES)[number];

export type AccountCurrencyBalance = {
  currency: AccountBalanceCurrency;
  amount: number;
  isPrimary: boolean;
};

export function getDefaultBalanceHiddenAccountIds(
  accounts: AccountWithBalance[],
): Set<string> {
  return new Set(
    accounts
      .filter((account) => account.type === "CREDIT_CARD")
      .map((account) => account.id),
  );
}

export function getAccountCurrencyBalances(
  account: AccountWithBalance,
): AccountCurrencyBalance[] {
  return ACCOUNT_BALANCE_CURRENCIES.filter((currency) => {
    if (currency === account.currency) return true;
    if (currency === account.secondaryCurrency) return true;
    return (account.balancesByCurrency?.[currency] ?? 0) !== 0;
  }).map((currency) => ({
    currency,
    amount: account.balancesByCurrency
      ? (account.balancesByCurrency[currency] ?? 0)
      : currency === account.currency
        ? account.balance
        : 0,
    isPrimary: currency === account.currency,
  }));
}

export function sumActiveAccountBalances(
  accounts: AccountWithBalance[],
  excludedAccountIds: ReadonlySet<string> = new Set(),
): Record<AccountBalanceCurrency, number> {
  const totals: Record<AccountBalanceCurrency, number> = {
    PEN: 0,
    USD: 0,
    EUR: 0,
  };

  for (const account of accounts) {
    if (account.isArchived || excludedAccountIds.has(account.id)) continue;

    for (const balance of getAccountCurrencyBalances(account)) {
      totals[balance.currency] += balance.amount;
    }
  }

  return totals;
}
