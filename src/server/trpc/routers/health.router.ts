import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import { del } from "@vercel/blob";
import {
  listAppointmentsSchema,
  getAppointmentByIdSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  deleteAppointmentSchema,
  addMedicationSchema,
  deleteMedicationSchema,
  createAttachmentSchema,
  deleteAttachmentSchema,
} from "@/server/trpc/schemas/health.schema";

const includeAll = {
  medications: { orderBy: { name: "asc" as const } },
  attachments: { orderBy: { createdAt: "desc" as const } },
};

export const healthRouter = router({
  appointment: router({
    list: publicProcedure
      .input(listAppointmentsSchema)
      .query(async ({ ctx, input }) => {
        const where: Prisma.DoctorAppointmentWhereInput = {};
        if (input?.from || input?.to) {
          where.date = {
            ...(input?.from && { gte: input.from }),
            ...(input?.to && { lte: input.to }),
          };
        }

        return ctx.db.doctorAppointment.findMany({
          where,
          orderBy: { date: "desc" },
          include: includeAll,
        });
      }),

    get: publicProcedure
      .input(getAppointmentByIdSchema)
      .query(async ({ ctx, input }) => {
        const appointment = await ctx.db.doctorAppointment.findUnique({
          where: { id: input.id },
          include: includeAll,
        });
        if (!appointment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Appointment ${input.id} not found`,
          });
        }
        return appointment;
      }),

    create: publicProcedure
      .input(createAppointmentSchema)
      .mutation(async ({ ctx, input }) => {
        const { medications, cost, ...rest } = input;
        return ctx.db.doctorAppointment.create({
          data: {
            ...rest,
            cost: cost != null ? new Prisma.Decimal(cost) : null,
            ...(medications?.length && {
              medications: { createMany: { data: medications } },
            }),
          },
          include: includeAll,
        });
      }),

    update: publicProcedure
      .input(updateAppointmentSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, cost, ...rest } = input;
        const data: Prisma.DoctorAppointmentUpdateInput = { ...rest };
        if (cost !== undefined) {
          data.cost = cost != null ? new Prisma.Decimal(cost) : null;
        }
        try {
          return await ctx.db.doctorAppointment.update({
            where: { id },
            data,
            include: includeAll,
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Appointment ${id} not found`,
            });
          }
          throw error;
        }
      }),

    delete: publicProcedure
      .input(deleteAppointmentSchema)
      .mutation(async ({ ctx, input }) => {
        const attachments = await ctx.db.attachment.findMany({
          where: { appointmentId: input.id },
        });
        await ctx.db.doctorAppointment.delete({ where: { id: input.id } });
        for (const a of attachments) {
          try {
            await del(a.url);
          } catch {
            // ignore — file may already be gone
          }
        }
        return { success: true };
      }),
  }),

  medication: router({
    add: publicProcedure
      .input(addMedicationSchema)
      .mutation(async ({ ctx, input }) => {
        return ctx.db.medication.create({ data: input });
      }),

    delete: publicProcedure
      .input(deleteMedicationSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.db.medication.delete({ where: { id: input.id } });
        return { success: true };
      }),
  }),

  attachment: router({
    create: publicProcedure
      .input(createAttachmentSchema)
      .mutation(async ({ ctx, input }) => {
        return ctx.db.attachment.create({ data: input });
      }),

    delete: publicProcedure
      .input(deleteAttachmentSchema)
      .mutation(async ({ ctx, input }) => {
        const attachment = await ctx.db.attachment.findUnique({
          where: { id: input.id },
        });
        if (!attachment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Attachment ${input.id} not found`,
          });
        }
        await ctx.db.attachment.delete({ where: { id: input.id } });
        try {
          await del(attachment.url);
        } catch {
          // ignore
        }
        return { success: true };
      }),
  }),
});
