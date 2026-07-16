"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotes(input?: { year?: number; month?: number }) {
  const trpc = useTRPC();
  return useQuery(trpc.notes.list.queryOptions(input));
}

export function useNote(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.notes.get.queryOptions({ id }));
}

export function useCreateNote() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.notes.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.notes.list.queryKey() });
    },
  });
}

export function useUpdateNote() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.notes.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: trpc.notes.list.queryKey() });
      queryClient.invalidateQueries({
        queryKey: trpc.notes.get.queryKey({ id: variables.id }),
      });
    },
  });
}

export function useDeleteNote() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.notes.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.notes.list.queryKey() });
    },
  });
}
