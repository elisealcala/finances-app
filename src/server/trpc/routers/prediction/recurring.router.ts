import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { RecurringTransaction as PrismaRecurring } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createRecurringSchema,
  updateRecurringSchema,
  getRecurringByIdSchema,
  listRecurringSchema,
  deleteRecurringSchema,
  createFromDebtSchema,
} from "@/server/trpc/schemas/prediction.schema";

function serializeRecurring(rt: PrismaRecurring) {
  return {
    ...rt,
    amount: Number(rt.amount),
  };
}

export const recurringRouter = router({
  list: publicProcedure
    .input(listRecurringSchema)
    .query(async ({ ctx, input }) => {
      const { accountId, type, isActive, debtId } = input ?? {};

      const where: Prisma.RecurringTransactionWhereInput = {
        ...(accountId && { accountId }),
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
        ...(debtId && { debtId }),
      };

      const items = await ctx.db.recurringTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          account: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true } },
          debt: { select: { id: true, name: true } },
        },
      });

      return {
        items: items.map((item) => ({
          ...serializeRecurring(item),
          account: item.account,
          category: item.category,
          debt: item.debt,
        })),
      };
    }),

  getById: publicProcedure
    .input(getRecurringByIdSchema)
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.recurringTransaction.findUnique({
        where: { id: input.id },
        include: {
          account: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true } },
          debt: { select: { id: true, name: true } },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Recurring transaction with ID ${input.id} not found`,
        });
      }

      return {
        ...serializeRecurring(item),
        account: item.account,
        category: item.category,
        debt: item.debt,
      };
    }),

  create: publicProcedure
    .input(createRecurringSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.recurringTransaction.create({
        data: {
          name: input.name,
          amount: new Prisma.Decimal(input.amount),
          type: input.type,
          frequency: input.frequency ?? "MONTHLY",
          dayOfMonth: input.dayOfMonth ?? null,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          isActive: input.isActive ?? true,
          accountId: input.accountId,
          categoryId: input.categoryId ?? null,
          debtId: input.debtId ?? null,
        },
      });

      return serializeRecurring(item);
    }),

  update: publicProcedure
    .input(updateRecurringSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.RecurringTransactionUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.amount !== undefined)
        updateData.amount = new Prisma.Decimal(data.amount);
      if (data.type !== undefined) updateData.type = data.type;
      if (data.frequency !== undefined) updateData.frequency = data.frequency;
      if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.accountId !== undefined)
        updateData.account = { connect: { id: data.accountId } };
      if (data.categoryId !== undefined) {
        updateData.category = data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };
      }
      if (data.debtId !== undefined) {
        updateData.debt = data.debtId
          ? { connect: { id: data.debtId } }
          : { disconnect: true };
      }

      try {
        const item = await ctx.db.recurringTransaction.update({
          where: { id },
          data: updateData,
        });
        return serializeRecurring(item);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Recurring transaction with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteRecurringSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.recurringTransaction.delete({
          where: { id: input.id },
        });
        return { success: true };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Recurring transaction with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),

  createFromDebt: publicProcedure
    .input(createFromDebtSchema)
    .mutation(async ({ ctx, input }) => {
      const debt = await ctx.db.debt.findUnique({
        where: { id: input.debtId },
        include: {
          installments: {
            where: { status: "PENDING" },
            orderBy: { dueDate: "asc" },
            take: 1,
          },
        },
      });

      if (!debt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Debt with ID ${input.debtId} not found`,
        });
      }

      const amount = debt.installments.length > 0
        ? Number(debt.installments[0].totalAmount)
        : Number(debt.minimumPayment);

      const item = await ctx.db.recurringTransaction.create({
        data: {
          name: `${debt.name} payment`,
          amount: new Prisma.Decimal(amount),
          type: "EXPENSE",
          frequency: "MONTHLY",
          dayOfMonth: debt.dueDate ?? null,
          startDate: new Date(),
          isActive: true,
          accountId: input.accountId,
          debtId: debt.id,
        },
      });

      return serializeRecurring(item);
    }),
});
