"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useImports(status: "PENDING" | "IMPORTED" | "DISMISSED" = "PENDING") {
  const trpc = useTRPC();
  return useQuery(trpc.imports.list.queryOptions({ status }));
}

export function useImportsPendingCount() {
  const trpc = useTRPC();
  return useQuery(trpc.imports.pendingCount.queryOptions());
}

export function useImportsStatus() {
  const trpc = useTRPC();
  return useQuery(trpc.imports.status.queryOptions());
}

function useInvalidate() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: trpc.imports.list.queryKey() });
    queryClient.invalidateQueries({
      queryKey: trpc.imports.pendingCount.queryKey(),
    });
    queryClient.invalidateQueries({ queryKey: trpc.imports.status.queryKey() });
  };
}

export function useConfirmImport() {
  const trpc = useTRPC();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.imports.confirm.mutationOptions(),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: trpc.finances.expense.list.queryKey(),
      });
    },
  });
}

export function useDismissImport() {
  const trpc = useTRPC();
  const invalidate = useInvalidate();
  return useMutation({
    ...trpc.imports.dismiss.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function usePollNow() {
  const trpc = useTRPC();
  const invalidate = useInvalidate();
  return useMutation({
    ...trpc.imports.pollNow.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useBackfill() {
  const trpc = useTRPC();
  const invalidate = useInvalidate();
  return useMutation({
    ...trpc.imports.backfill.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useUpdatePollSettings() {
  const trpc = useTRPC();
  const invalidate = useInvalidate();
  return useMutation({
    ...trpc.imports.updateSettings.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useDisconnectGmail() {
  const trpc = useTRPC();
  const invalidate = useInvalidate();
  return useMutation({
    ...trpc.imports.disconnect.mutationOptions(),
    onSuccess: invalidate,
  });
}
