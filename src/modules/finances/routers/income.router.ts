import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Income as PrismaIncome } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createIncomeSchema,
  updateIncomeSchema,
  listIncomesSchema,
  deleteIncomeSchema,
} from "../schema";

function serializeIncome(income: PrismaIncome & { account?: unknown; category?: unknown }) {
  return {
    ...income,
    amount: Number(income.amount),
  };
}

export const incomeRouter = router({
  list: publicProcedure
    .input(listIncomesSchema)
    .query(async ({ ctx, input }) => {
      const {
        year,
        month,
        accountId,
        categoryId,
        sortBy = "date",
        sortOrder = "desc",
      } = input ?? {};

      const where: Prisma.IncomeWhereInput = {};

      if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1);
        const endDate = month
          ? new Date(year, month, 1)
          : new Date(year + 1, 0, 1);
        where.date = { gte: startDate, lt: endDate };
      }

      if (accountId) where.accountId = accountId;
      if (categoryId) where.categoryId = categoryId;

      const rawIncomes = await ctx.db.income.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true, color: true } },
          category: { select: { id: true, name: true, color: true, icon: true } },
        },
      });

      const incomes = rawIncomes.map(serializeIncome);
      const total = incomes.reduce((sum, i) => sum + i.amount, 0);

      const totalsByCurrency: Record<string, number> = {};
      for (const i of rawIncomes) {
        const currency =
          (i as unknown as { account?: { currency?: string } }).account
            ?.currency ?? "PEN";
        totalsByCurrency[currency] =
          (totalsByCurrency[currency] ?? 0) + Number(i.amount);
      }

      return { incomes, total, totalsByCurrency };
    }),

  create: publicProcedure
    .input(createIncomeSchema)
    .mutation(async ({ ctx, input }) => {
      const income = await ctx.db.income.create({
        data: {
          name: input.name,
          amount: new Prisma.Decimal(input.amount),
          date: input.date,
          notes: input.notes ?? null,
          accountId: input.accountId,
          categoryId: input.categoryId ?? null,
        },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true, color: true } },
          category: { select: { id: true, name: true, color: true, icon: true } },
        },
      });
      return serializeIncome(income);
    }),

  update: publicProcedure
    .input(updateIncomeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.IncomeUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.amount !== undefined)
        updateData.amount = new Prisma.Decimal(data.amount);
      if (data.date !== undefined) updateData.date = data.date;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.accountId !== undefined)
        updateData.account = { connect: { id: data.accountId } };
      if (data.categoryId !== undefined)
        updateData.category = data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };

      try {
        const income = await ctx.db.income.update({
          where: { id },
          data: updateData,
          include: {
            account: { select: { id: true, name: true, currency: true, type: true, color: true } },
            category: { select: { id: true, name: true, color: true, icon: true } },
          },
        });
        return serializeIncome(income);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Income with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteIncomeSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.income.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Income with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
