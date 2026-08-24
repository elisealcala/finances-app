"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/server/trpc/utils";

export function useHubWorkspace() {
  const trpc = useTRPC();
  return useQuery(trpc.hub.workspace.queryOptions());
}

export function useHubMutations() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.hub.workspace.queryKey() });

  return {
    createTask: useMutation({
      ...trpc.hub.task.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    updateTask: useMutation({
      ...trpc.hub.task.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    deleteTask: useMutation({
      ...trpc.hub.task.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
    createSubtask: useMutation({
      ...trpc.hub.subtask.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    updateSubtask: useMutation({
      ...trpc.hub.subtask.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    deleteSubtask: useMutation({
      ...trpc.hub.subtask.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
    createIdea: useMutation({
      ...trpc.hub.idea.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    updateIdea: useMutation({
      ...trpc.hub.idea.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    deleteIdea: useMutation({
      ...trpc.hub.idea.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
    convertIdea: useMutation({
      ...trpc.hub.idea.convert.mutationOptions(),
      onSuccess: invalidate,
    }),
    createProject: useMutation({
      ...trpc.hub.project.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    updateProject: useMutation({
      ...trpc.hub.project.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    deleteProject: useMutation({
      ...trpc.hub.project.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
    createLabel: useMutation({
      ...trpc.hub.label.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    updateLabel: useMutation({
      ...trpc.hub.label.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    deleteLabel: useMutation({
      ...trpc.hub.label.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
    importStarterData: useMutation({
      ...trpc.hub.importStarterData.mutationOptions(),
      onSuccess: invalidate,
    }),
  };
}
