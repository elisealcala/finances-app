"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/server/trpc/utils";

export function useKnowledgeStatus() {
  const trpc = useTRPC();
  return useQuery(trpc.knowledge.status.queryOptions());
}

export function useKnowledgeDocuments(input?: {
  search?: string;
  tag?: string;
  pillar?: string;
  limit?: number;
}) {
  const trpc = useTRPC();
  return useQuery(trpc.knowledge.list.queryOptions(input ?? {}));
}

export function useKnowledgeDocument(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.knowledge.get.queryOptions({ id }));
}

export function useSyncKnowledge() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.knowledge.sync.mutationOptions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.knowledge.status.queryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.knowledge.list.queryKey(),
        }),
      ]);
    },
  });
}
