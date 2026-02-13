"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListDebtsInput } from "../schema";

export function useDebts(input?: ListDebtsInput) {
  const trpc = useTRPC();
  return useQuery(trpc.debt.list.queryOptions(input));
}

export function useDebt(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.debt.getById.queryOptions({ id }));
}

export function useCreateDebt() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
    },
  });
}

export function useUpdateDebt() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
      queryClient.invalidateQueries({
        queryKey: trpc.debt.getById.queryKey({ id: variables.id }),
      });
    },
  });
}

export function useDeleteDebt() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
    },
  });
}

export function useAddPayment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.addPayment.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
    },
  });
}

export function useDeletePayment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.debt.deletePayment.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.debt.list.queryKey() });
    },
  });
}
