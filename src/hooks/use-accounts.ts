"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListAccountsInput } from "@/server/trpc/schemas/finances.schema";

export function useAccounts(input?: ListAccountsInput) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.account.list.queryOptions(input));
}

export function useAccount(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.account.getById.queryOptions({ id }));
}

export function useCreateAccount() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.account.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useUpdateAccount() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.account.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.getById.queryKey({ id: variables.id }),
      });
    },
  });
}

export function useDeleteAccount() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.account.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}
