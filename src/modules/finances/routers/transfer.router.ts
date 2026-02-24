import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Transfer as PrismaTransfer } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createTransferSchema,
  updateTransferSchema,
  listTransfersSchema,
  deleteTransferSchema,
} from "../schema";

function serializeTransfer(transfer: PrismaTransfer & { fromAccount?: unknown; toAccount?: unknown }) {
  return {
    ...transfer,
    amount: Number(transfer.amount),
  };
}

export const transferRouter = router({
  list: publicProcedure
    .input(listTransfersSchema)
    .query(async ({ ctx, input }) => {
      const {
        year,
        month,
        accountId,
        sortBy = "date",
        sortOrder = "desc",
      } = input ?? {};

      const where: Prisma.TransferWhereInput = {};

      if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1);
        const endDate = month
          ? new Date(year, month, 1)
          : new Date(year + 1, 0, 1);
        where.date = { gte: startDate, lt: endDate };
      }

      if (accountId) {
        where.OR = [
          { fromAccountId: accountId },
          { toAccountId: accountId },
        ];
      }

      const rawTransfers = await ctx.db.transfer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          fromAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
          toAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
        },
      });

      const transfers = rawTransfers.map(serializeTransfer);
      const total = transfers.reduce((sum, t) => sum + t.amount, 0);

      const totalsByCurrency: Record<string, number> = {};
      for (const t of rawTransfers) {
        const currency =
          (t as unknown as { fromAccount?: { currency?: string } }).fromAccount
            ?.currency ?? "PEN";
        totalsByCurrency[currency] =
          (totalsByCurrency[currency] ?? 0) + Number(t.amount);
      }

      return { transfers, total, totalsByCurrency };
    }),

  create: publicProcedure
    .input(createTransferSchema)
    .mutation(async ({ ctx, input }) => {
      const transfer = await ctx.db.transfer.create({
        data: {
          name: input.name,
          amount: new Prisma.Decimal(input.amount),
          date: input.date,
          notes: input.notes ?? null,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
        },
        include: {
          fromAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
          toAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
        },
      });
      return serializeTransfer(transfer);
    }),

  update: publicProcedure
    .input(updateTransferSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.TransferUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.amount !== undefined)
        updateData.amount = new Prisma.Decimal(data.amount);
      if (data.date !== undefined) updateData.date = data.date;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.fromAccountId !== undefined)
        updateData.fromAccount = { connect: { id: data.fromAccountId } };
      if (data.toAccountId !== undefined)
        updateData.toAccount = { connect: { id: data.toAccountId } };

      try {
        const transfer = await ctx.db.transfer.update({
          where: { id },
          data: updateData,
          include: {
          fromAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
          toAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
        },
        });
        return serializeTransfer(transfer);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Transfer with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteTransferSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.transfer.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Transfer with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
