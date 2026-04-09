"use client";

import { useState, useCallback, useMemo } from "react";
import type { Debt } from "@/types/debt";

export function useDebtVisibility() {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const toggleVisibility = useCallback((debtId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(debtId)) {
        next.delete(debtId);
      } else {
        next.add(debtId);
      }
      return next;
    });
  }, []);

  const filterVisible = useCallback(
    (debts: Debt[]) => debts.filter((d) => !hiddenIds.has(d.id)),
    [hiddenIds],
  );

  const isHidden = useCallback(
    (debtId: string) => hiddenIds.has(debtId),
    [hiddenIds],
  );

  const showAll = useCallback(() => setHiddenIds(new Set()), []);

  const hiddenCount = useMemo(() => hiddenIds.size, [hiddenIds]);

  return { toggleVisibility, filterVisible, isHidden, showAll, hiddenCount };
}
