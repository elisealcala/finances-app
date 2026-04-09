"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListRecurringInput } from "@/server/trpc/schemas/prediction.schema";

export function useRecurringTransactions(input?: ListRecurringInput) {
  const trpc = useTRPC();
  return useQuery(trpc.prediction.recurring.list.queryOptions(input));
}

export function useRecurringTransaction(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.prediction.recurring.getById.queryOptions({ id }));
}

export function useCreateRecurring() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.prediction.recurring.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.recurring.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.availableBalances.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.alerts.queryKey(),
      });
    },
  });
}

export function useUpdateRecurring() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.prediction.recurring.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.recurring.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.recurring.getById.queryKey({
          id: variables.id,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.availableBalances.queryKey(),
      });
    },
  });
}

export function useDeleteRecurring() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.prediction.recurring.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.recurring.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.availableBalances.queryKey(),
      });
    },
  });
}

export function useCreateRecurringFromDebt() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.prediction.recurring.createFromDebt.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.recurring.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.availableBalances.queryKey(),
      });
    },
  });
}
