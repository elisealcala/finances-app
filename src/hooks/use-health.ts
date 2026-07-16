"use client";

import { useTRPC } from "@/server/trpc/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAppointments(input?: { from?: Date; to?: Date }) {
  const trpc = useTRPC();
  return useQuery(trpc.health.appointment.list.queryOptions(input));
}

export function useAppointment(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.health.appointment.get.queryOptions({ id }));
}

export function useCreateAppointment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.appointment.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.health.appointment.list.queryKey(),
      });
    },
  });
}

export function useUpdateAppointment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.appointment.update.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.health.appointment.list.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.health.appointment.get.queryKey({ id: variables.id }),
      });
    },
  });
}

export function useDeleteAppointment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.appointment.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.health.appointment.list.queryKey(),
      });
    },
  });
}

export function useAddMedication() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.medication.add.mutationOptions(),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: trpc.health.appointment.get.queryKey({
          id: variables.appointmentId,
        }),
      });
    },
  });
}

export function useDeleteMedication() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.medication.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.health.appointment.list.queryKey(),
      });
    },
  });
}

export function useCreateAttachment() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.attachment.create.mutationOptions(),
    onSuccess: (_data, variables) => {
      if (variables.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: trpc.health.appointment.get.queryKey({
            id: variables.appointmentId,
          }),
        });
      }
    },
  });
}

export function useDeleteAttachment(appointmentId?: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.health.attachment.delete.mutationOptions(),
    onSuccess: () => {
      if (appointmentId) {
        queryClient.invalidateQueries({
          queryKey: trpc.health.appointment.get.queryKey({ id: appointmentId }),
        });
      }
    },
  });
}
