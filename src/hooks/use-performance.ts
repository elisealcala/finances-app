"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/server/trpc/utils";

function useInvalidatePerformance() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.performance.dashboard.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.overview.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.cycle.list.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.cycle.get.queryKey(),
      }),
    ]);
}

export function usePerformanceDashboard() {
  const trpc = useTRPC();
  return useQuery(trpc.performance.dashboard.queryOptions());
}

export function useCreatePerformanceCycle() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.cycle.create.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useGeneratePerformancePlan() {
  const trpc = useTRPC();
  return useMutation(trpc.performance.plan.generate.mutationOptions());
}

export function useCreatePerformanceCycleFromPlan() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.cycle.createFromPlan.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useUpdatePerformanceCycle() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.cycle.update.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCreatePerformanceOutcome() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.outcome.create.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useUpdatePerformanceOutcome() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.outcome.update.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useDeletePerformanceOutcome() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.outcome.delete.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCreatePerformanceKeyResult() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.keyResult.create.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useUpdatePerformanceKeyResult() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.keyResult.update.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useDeletePerformanceKeyResult() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.keyResult.delete.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCreatePerformanceProgressUpdate() {
  const trpc = useTRPC();
  const invalidate = useInvalidatePerformance();
  return useMutation({
    ...trpc.performance.progress.create.mutationOptions(),
    onSuccess: invalidate,
  });
}
