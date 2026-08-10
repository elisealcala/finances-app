"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/server/trpc/utils";

export function useFinanceCycles() {
  const trpc = useTRPC();
  return useQuery(trpc.finances.cycle.list.queryOptions());
}

export function useFinanceCycleDefaults() {
  const trpc = useTRPC();
  return useQuery(trpc.finances.cycle.defaults.queryOptions());
}

function useInvalidateFinanceCycles() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: trpc.finances.cycle.list.queryKey(),
    });
}

export function useCreateFinanceCycle() {
  const trpc = useTRPC();
  const invalidate = useInvalidateFinanceCycles();
  return useMutation({
    ...trpc.finances.cycle.create.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useUpdateFinanceCycle() {
  const trpc = useTRPC();
  const invalidate = useInvalidateFinanceCycles();
  return useMutation({
    ...trpc.finances.cycle.update.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCloseFinanceCycle() {
  const trpc = useTRPC();
  const invalidate = useInvalidateFinanceCycles();
  return useMutation({
    ...trpc.finances.cycle.close.mutationOptions(),
    onSuccess: invalidate,
  });
}
