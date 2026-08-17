"use client";

import { useCallback, useMemo, useState } from "react";
import type { AccountWithBalance } from "@/types/finances";

export function useAccountBalanceVisibility(accounts: AccountWithBalance[]) {
  const [hiddenAccountIds, setHiddenAccountIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleVisibility = useCallback((accountId: string) => {
    setHiddenAccountIds((previous) => {
      const next = new Set(previous);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const isHidden = useCallback(
    (accountId: string) => hiddenAccountIds.has(accountId),
    [hiddenAccountIds],
  );

  const showAll = useCallback(() => setHiddenAccountIds(new Set()), []);

  const hiddenCount = useMemo(
    () =>
      accounts.filter(
        (account) =>
          !account.isArchived && hiddenAccountIds.has(account.id),
      ).length,
    [accounts, hiddenAccountIds],
  );

  return {
    hiddenAccountIds,
    hiddenCount,
    isHidden,
    showAll,
    toggleVisibility,
  };
}
