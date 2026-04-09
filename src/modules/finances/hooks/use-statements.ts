"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListStatementsInput } from "../schema";

export function useStatements(input?: ListStatementsInput) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.statement.list.queryOptions(input));
}

export function useStatement(
  id: string,
  options?: { enabled?: boolean },
) {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.finances.statement.getById.queryOptions({ id }),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateStatement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.statement.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.list.queryKey(),
      });
    },
  });
}

export function useUpdateStatement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.statement.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.getById.queryKey({ id: variables.id }),
      });
    },
  });
}

export function useCloseStatement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.statement.close.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.getById.queryKey({ id: variables.id }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function usePayStatement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.statement.pay.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.getById.queryKey({ id: variables.id }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.transfer.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useDeleteStatement() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.statement.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.statement.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}
