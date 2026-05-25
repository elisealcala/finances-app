"use client";

import { useState, useMemo, useCallback } from "react";
import { simulateExtraPayment, type SimulationResult } from "@/server/trpc/services/debt/amortization";
import type { Debt } from "@/types/debt";

export function useDebtSimulation(debts: Debt[]) {
  const [selectedDebtId, setSelectedDebtId] = useState<string>("");
  const [extraPayment, setExtraPayment] = useState<number>(0);

  const selectedDebt = useMemo(
    () => debts.find((d) => d.id === selectedDebtId) ?? null,
    [debts, selectedDebtId],
  );

  const result: SimulationResult | null = useMemo(() => {
    if (!selectedDebt || extraPayment <= 0) return null;
    return simulateExtraPayment(selectedDebt, extraPayment);
  }, [selectedDebt, extraPayment]);

  const clear = useCallback(() => {
    setSelectedDebtId("");
    setExtraPayment(0);
  }, []);

  return {
    selectedDebtId,
    setSelectedDebtId,
    extraPayment,
    setExtraPayment,
    selectedDebt,
    result,
    clear,
  };
}
