"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery } from "@tanstack/react-query";

type Currency = "PEN" | "USD" | "EUR";

export function useMonthlySummary(year: number, currency: Currency = "PEN") {
  const trpc = useTRPC();
  return useQuery(
    trpc.finances.overview.monthlySummary.queryOptions({ year, currency }),
  );
}

export function usePeriodSummary(
  year: number,
  month: number | undefined,
  currency: Currency = "PEN",
) {
  const trpc = useTRPC();
  return useQuery(
    trpc.finances.overview.periodSummary.queryOptions({
      year,
      month,
      currency,
    }),
  );
}
