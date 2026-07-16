import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  listNotesSchema,
  getNoteByIdSchema,
  createNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
} from "@/server/trpc/schemas/notes.schema";

export const notesRouter = router({
  list: publicProcedure.input(listNotesSchema).query(async ({ ctx, input }) => {
    const where: Prisma.NoteWhereInput = {};
    if (input?.year != null && input?.month != null) {
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 1);
      where.date = { gte: start, lt: end };
    } else if (input?.year != null) {
      const start = new Date(input.year, 0, 1);
      const end = new Date(input.year + 1, 0, 1);
      where.date = { gte: start, lt: end };
    }

    return ctx.db.note.findMany({
      where,
      orderBy: { date: "desc" },
    });
  }),

  get: publicProcedure
    .input(getNoteByIdSchema)
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({ where: { id: input.id } });
      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Note ${input.id} not found`,
        });
      }
      return note;
    }),

  create: publicProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.note.create({
        data: {
          date: input.date,
          title: input.title ?? null,
          content: (input.content ?? {}) as Prisma.InputJsonValue,
        },
      });
    }),

  update: publicProcedure
    .input(updateNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, content, ...rest } = input;
      const data: Prisma.NoteUpdateInput = { ...rest };
      if (content !== undefined) {
        data.content = (content ?? {}) as Prisma.InputJsonValue;
      }
      try {
        return await ctx.db.note.update({ where: { id }, data });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Note ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteNoteSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.note.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
