import type { AccountWithBalance } from "@/types/finances";

export const ACCOUNT_BALANCE_CURRENCIES = ["PEN", "USD", "EUR"] as const;

export type AccountBalanceCurrency =
  (typeof ACCOUNT_BALANCE_CURRENCIES)[number];

export function sumActiveAccountBalances(
  accounts: AccountWithBalance[],
): Record<AccountBalanceCurrency, number> {
  const totals: Record<AccountBalanceCurrency, number> = {
    PEN: 0,
    USD: 0,
    EUR: 0,
  };

  for (const account of accounts) {
    if (account.isArchived) continue;

    if (account.balancesByCurrency) {
      for (const currency of ACCOUNT_BALANCE_CURRENCIES) {
        totals[currency] += account.balancesByCurrency[currency] ?? 0;
      }
      continue;
    }

    totals[account.currency] += account.balance;
  }

  return totals;
}
