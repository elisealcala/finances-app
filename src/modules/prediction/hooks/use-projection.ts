"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery } from "@tanstack/react-query";

export function useAvailableBalances() {
  const trpc = useTRPC();
  return useQuery(trpc.prediction.projection.availableBalances.queryOptions());
}

export function useAccountAvailable(accountId: string) {
  const trpc = useTRPC();
  return useQuery(
    trpc.prediction.projection.accountAvailable.queryOptions({ accountId }),
  );
}

export function useCashFlow(months: number = 6) {
  const trpc = useTRPC();
  return useQuery(
    trpc.prediction.projection.cashFlow.queryOptions({ months }),
  );
}

export function useUpcoming(daysAhead: number = 30) {
  const trpc = useTRPC();
  return useQuery(
    trpc.prediction.projection.upcoming.queryOptions({ daysAhead }),
  );
}

export function useSpendingRoom() {
  const trpc = useTRPC();
  return useQuery(trpc.prediction.projection.spendingRoom.queryOptions());
}
