"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery } from "@tanstack/react-query";

export function useMonthlySummary(year: number) {
  const trpc = useTRPC();
  return useQuery(
    trpc.finances.overview.monthlySummary.queryOptions({ year }),
  );
}

export function usePeriodSummary(year: number, month: number | undefined) {
  const trpc = useTRPC();
  return useQuery(
    trpc.finances.overview.periodSummary.queryOptions({ year, month }),
  );
}
