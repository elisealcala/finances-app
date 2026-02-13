import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Expense as PrismaExpense } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  deleteExpenseSchema,
} from "../schema";

function serializeExpense(expense: PrismaExpense & { account?: unknown; category?: unknown }) {
  return {
    ...expense,
    amount: Number(expense.amount),
  };
}

export const expenseRouter = router({
  list: publicProcedure
    .input(listExpensesSchema)
    .query(async ({ ctx, input }) => {
      const {
        year,
        month,
        accountId,
        categoryId,
        paymentStatus,
        sortBy = "date",
        sortOrder = "desc",
      } = input ?? {};

      const where: Prisma.ExpenseWhereInput = {};

      if (year) {
        const startDate = new Date(year, month ? month - 1 : 0, 1);
        const endDate = month
          ? new Date(year, month, 1)
          : new Date(year + 1, 0, 1);
        where.date = { gte: startDate, lt: endDate };
      }

      if (accountId) where.accountId = accountId;
      if (categoryId) where.categoryId = categoryId;
      if (paymentStatus) where.paymentStatus = paymentStatus;

      const rawExpenses = await ctx.db.expense.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: { account: true, category: true },
      });

      const expenses = rawExpenses.map(serializeExpense);
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);

      return { expenses, total };
    }),

  create: publicProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      // Auto-set NOT_PAID for credit card accounts
      let paymentStatus = input.paymentStatus ?? "PAID";
      if (paymentStatus === "PAID") {
        const account = await ctx.db.account.findUnique({
          where: { id: input.accountId },
          select: { type: true },
        });
        if (account?.type === "CREDIT_CARD") {
          paymentStatus = "NOT_PAID";
        }
      }

      const expense = await ctx.db.expense.create({
        data: {
          name: input.name,
          amount: new Prisma.Decimal(input.amount),
          date: input.date,
          paymentStatus,
          notes: input.notes ?? null,
          accountId: input.accountId,
          categoryId: input.categoryId ?? null,
        },
        include: { account: true, category: true },
      });
      return serializeExpense(expense);
    }),

  update: publicProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.ExpenseUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.amount !== undefined)
        updateData.amount = new Prisma.Decimal(data.amount);
      if (data.date !== undefined) updateData.date = data.date;
      if (data.paymentStatus !== undefined)
        updateData.paymentStatus = data.paymentStatus;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.accountId !== undefined)
        updateData.account = { connect: { id: data.accountId } };
      if (data.categoryId !== undefined)
        updateData.category = data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };

      try {
        const expense = await ctx.db.expense.update({
          where: { id },
          data: updateData,
          include: { account: true, category: true },
        });
        return serializeExpense(expense);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Expense with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.expense.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Expense with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
