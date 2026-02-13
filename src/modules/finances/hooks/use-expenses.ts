"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListExpensesInput } from "../schema";

export function useExpenses(input?: ListExpensesInput) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.expense.list.queryOptions(input));
}

export function useCreateExpense() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.expense.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useUpdateExpense() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.expense.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useDeleteExpense() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.expense.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}
