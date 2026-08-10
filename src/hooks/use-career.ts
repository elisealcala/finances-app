"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/server/trpc/utils";

function useInvalidateCareer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.career.overview.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.cycle.list.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.cycle.get.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.performance.dashboard.queryKey(),
      }),
    ]);
  };
}

function useInvalidateResume() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.career.profile.get.queryKey() }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.experience.list.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.education.list.queryKey(),
      }),
      queryClient.invalidateQueries({ queryKey: trpc.career.project.list.queryKey() }),
      queryClient.invalidateQueries({
        queryKey: trpc.career.opportunity.list.queryKey(),
      }),
      queryClient.invalidateQueries({ queryKey: trpc.career.resume.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.career.resume.get.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.career.overview.queryKey() }),
    ]);
  };
}

export function useCareerOverview() {
  const trpc = useTRPC();
  return useQuery(trpc.career.overview.queryOptions());
}

export function useCareerCycles(includeArchived = false) {
  const trpc = useTRPC();
  return useQuery(
    trpc.career.cycle.list.queryOptions({ includeArchived }),
  );
}

export function useCareerCycle(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.career.cycle.get.queryOptions({ id }));
}

export function useTransitionCareerCycle() {
  const trpc = useTRPC();
  const invalidate = useInvalidateCareer();
  return useMutation({
    ...trpc.career.cycle.transition.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useSubmitCareerOutput() {
  const trpc = useTRPC();
  const invalidate = useInvalidateCareer();
  return useMutation({
    ...trpc.career.output.submit.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useGradeCareerOutput() {
  const trpc = useTRPC();
  const invalidate = useInvalidateCareer();
  return useMutation({
    ...trpc.career.output.grade.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useAcceptCareerEvaluation() {
  const trpc = useTRPC();
  const invalidate = useInvalidateCareer();
  return useMutation({
    ...trpc.career.evaluation.accept.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCreateGithubRepository() {
  const trpc = useTRPC();
  return useMutation(trpc.career.github.createRepository.mutationOptions());
}

export function useCareerProfile() {
  const trpc = useTRPC();
  return useQuery(trpc.career.profile.get.queryOptions());
}

export function useUpdateCareerProfile() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return useMutation({
    ...trpc.career.profile.update.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useCareerExperiences() {
  const trpc = useTRPC();
  return useQuery(trpc.career.experience.list.queryOptions());
}

export function useCareerExperienceMutations() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return {
    create: useMutation({
      ...trpc.career.experience.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    update: useMutation({
      ...trpc.career.experience.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      ...trpc.career.experience.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
  };
}

export function useCareerEducation() {
  const trpc = useTRPC();
  return useQuery(trpc.career.education.list.queryOptions());
}

export function useCareerEducationMutations() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return {
    create: useMutation({
      ...trpc.career.education.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    update: useMutation({
      ...trpc.career.education.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      ...trpc.career.education.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
  };
}

export function useCareerProjects() {
  const trpc = useTRPC();
  return useQuery(trpc.career.project.list.queryOptions());
}

export function useCareerProjectMutations() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return {
    create: useMutation({
      ...trpc.career.project.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    update: useMutation({
      ...trpc.career.project.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      ...trpc.career.project.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
  };
}

export function useCareerOpportunities() {
  const trpc = useTRPC();
  return useQuery(trpc.career.opportunity.list.queryOptions());
}

export function useCareerOpportunityMutations() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return {
    create: useMutation({
      ...trpc.career.opportunity.create.mutationOptions(),
      onSuccess: invalidate,
    }),
    update: useMutation({
      ...trpc.career.opportunity.update.mutationOptions(),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      ...trpc.career.opportunity.delete.mutationOptions(),
      onSuccess: invalidate,
    }),
  };
}

export function useCareerResumes() {
  const trpc = useTRPC();
  return useQuery(trpc.career.resume.list.queryOptions());
}

export function useCareerResume(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.career.resume.get.queryOptions({ id }));
}

export function useGenerateCareerResume() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return useMutation({
    ...trpc.career.resume.generate.mutationOptions(),
    onSuccess: invalidate,
  });
}

export function useSaveCareerResume() {
  const trpc = useTRPC();
  const invalidate = useInvalidateResume();
  return useMutation({
    ...trpc.career.resume.save.mutationOptions(),
    onSuccess: invalidate,
  });
}

