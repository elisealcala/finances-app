"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ListCategoriesInput, CategorySummaryInput } from "@/server/trpc/schemas/finances.schema";

export function useCategories(input?: ListCategoriesInput) {
  const trpc = useTRPC();
  return useQuery(trpc.finances.category.list.queryOptions(input));
}

export function useCreateCategory() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.category.create.mutationOptions(),
    onSuccess: () => {
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

export function useUpdateCategory() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.category.update.mutationOptions(),
    onSuccess: () => {
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

export function useDeleteCategory() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.finances.category.delete.mutationOptions(),
    onSuccess: () => {
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

export function useBudgetStatus(year: number, month: number | undefined) {
  const trpc = useTRPC();
  return useQuery(
    trpc.finances.category.budgetStatus.queryOptions({ year, month }),
  );
}

export function useCategorySummary(input: CategorySummaryInput) {
  const trpc = useTRPC();
  return useQuery(
    trpc.finances.category.summary.queryOptions(input),
  );
}
