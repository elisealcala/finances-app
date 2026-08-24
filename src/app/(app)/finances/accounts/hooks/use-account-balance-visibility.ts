"use client";

import { useCallback, useMemo, useState } from "react";
import { getDefaultBalanceHiddenAccountIds } from "@/lib/account-balance-totals";
import type { AccountWithBalance } from "@/types/finances";

export function useAccountBalanceVisibility(accounts: AccountWithBalance[]) {
  const [visibilityOverrides, setVisibilityOverrides] = useState<
    Map<string, boolean>
  >(new Map());

  const defaultHiddenAccountIds = useMemo(
    () => getDefaultBalanceHiddenAccountIds(accounts),
    [accounts],
  );

  const hiddenAccountIds = useMemo(() => {
    const hiddenIds = new Set(defaultHiddenAccountIds);
    for (const [accountId, hidden] of visibilityOverrides) {
      if (hidden) {
        hiddenIds.add(accountId);
      } else {
        hiddenIds.delete(accountId);
      }
    }
    return hiddenIds;
  }, [defaultHiddenAccountIds, visibilityOverrides]);

  const toggleVisibility = useCallback(
    (accountId: string) => {
      setVisibilityOverrides((previous) => {
        const next = new Map(previous);
        const hidden =
          next.get(accountId) ?? defaultHiddenAccountIds.has(accountId);
        const nextHidden = !hidden;

        if (nextHidden === defaultHiddenAccountIds.has(accountId)) {
          next.delete(accountId);
        } else {
          next.set(accountId, nextHidden);
        }
        return next;
      });
    },
    [defaultHiddenAccountIds],
  );

  const isHidden = useCallback(
    (accountId: string) => hiddenAccountIds.has(accountId),
    [hiddenAccountIds],
  );

  const showAll = useCallback(() => {
    setVisibilityOverrides((previous) => {
      const next = new Map(previous);
      for (const account of accounts) {
        if (defaultHiddenAccountIds.has(account.id)) {
          next.set(account.id, false);
        } else {
          next.delete(account.id);
        }
      }
      return next;
    });
  }, [accounts, defaultHiddenAccountIds]);

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
