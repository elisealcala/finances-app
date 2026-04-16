"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Debt } from "@/types/debt";

export function useDebtVisibility(debts: Debt[]) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Auto-hide paid-off debts on first data load
  useEffect(() => {
    if (initializedRef.current || debts.length === 0) return;
    initializedRef.current = true;
    const paidOff = debts
      .filter((d) => d.status === "PAID_OFF")
      .map((d) => d.id);
    if (paidOff.length > 0) {
      setHiddenIds(new Set(paidOff));
    }
  }, [debts]);

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
    (allDebts: Debt[]) => allDebts.filter((d) => !hiddenIds.has(d.id)),
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
