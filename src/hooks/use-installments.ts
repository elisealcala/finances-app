"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useMarkInstallmentPaid() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.markInstallmentPaid.mutationOptions(),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
      queryClient.invalidateQueries({
        queryKey: trpc.debt.getById.queryKey({ id: _data.id }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.category.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.category.summary.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.category.budgetStatus.queryKey(),
      });
    },
  });
}

export function useMarkInstallmentUnpaid() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.markInstallmentUnpaid.mutationOptions(),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
      queryClient.invalidateQueries({
        queryKey: trpc.debt.getById.queryKey({ id: _data.id }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.category.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.category.summary.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.category.budgetStatus.queryKey(),
      });
    },
  });
}

export function useAddScheduleCapitalPayment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.addScheduleCapitalPayment.mutationOptions(),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
      queryClient.invalidateQueries({
        queryKey: trpc.debt.getById.queryKey({ id: _data.id }),
      });
    },
  });
}
