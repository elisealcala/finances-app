"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListFundingLinksInput } from "@/server/trpc/schemas/prediction.schema";

export function useFundingLinks(input?: ListFundingLinksInput) {
  const trpc = useTRPC();
  return useQuery(trpc.prediction.funding.list.queryOptions(input));
}

export function useFundingLinksForAccount(accountId?: string) {
  const trpc = useTRPC();
  return useQuery(
    trpc.prediction.funding.listForAccount.queryOptions(
      accountId ? { accountId } : undefined,
    ),
  );
}

export function useCreateFundingLink() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.prediction.funding.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.funding.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.availableBalances.queryKey(),
      });
    },
  });
}

export function useDeleteFundingLink() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.prediction.funding.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.funding.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.prediction.projection.availableBalances.queryKey(),
      });
    },
  });
}
