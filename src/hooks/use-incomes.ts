"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListIncomesInput } from "@/server/trpc/schemas/finances.schema";

export function useIncomes(input?: ListIncomesInput) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.income.list.queryOptions(input));
}

export function useCreateIncome() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.income.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.income.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useUpdateIncome() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.income.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.income.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useDeleteIncome() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.income.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.income.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}
