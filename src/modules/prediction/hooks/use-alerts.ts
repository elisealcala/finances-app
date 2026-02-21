"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery } from "@tanstack/react-query";

export function useAlerts() {
  const trpc = useTRPC();
  return useQuery(trpc.prediction.projection.alerts.queryOptions());
}
