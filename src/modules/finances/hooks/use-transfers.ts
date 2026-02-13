"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListTransfersInput } from "../schema";

export function useTransfers(input?: ListTransfersInput) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.transfer.list.queryOptions(input));
}

export function useCreateTransfer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.transfer.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.transfer.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useUpdateTransfer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.transfer.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.transfer.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}

export function useDeleteTransfer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.transfer.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.finances.transfer.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.finances.account.list.queryKey(),
      });
    },
  });
}
