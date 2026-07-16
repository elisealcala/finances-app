import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Expense as PrismaExpense } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesSchema,
  deleteExpenseSchema,
  markExpensePaidSchema,
} from "@/server/trpc/schemas/finances.schema";
import { createExpenseInternal } from "@/server/trpc/services/finances/expense";

function serializeExpense(expense: PrismaExpense & { account?: Record<string, unknown>; category?: Record<string, unknown> | null }) {
  return {
    ...expense,
    amount: Number(expense.amount),
    ...(expense.category && {
      category: {
        ...expense.category,
        monthlyBudget: expense.category.monthlyBudget != null ? Number(expense.category.monthlyBudget) : null,
      },
    }),
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
        statementId,
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
      if (statementId) where.statementId = statementId;

      const rawExpenses = await ctx.db.expense.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true, color: true } },
          category: { select: { id: true, name: true, color: true, icon: true, monthlyBudget: true } },
          payingAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
        },
      });

      const expenses = rawExpenses.map(serializeExpense);
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);

      const totalsByCurrency: Record<string, number> = {};
      for (const e of rawExpenses) {
        const currency =
          e.currency ??
          (e as unknown as { account?: { currency?: string } }).account
            ?.currency ??
          "PEN";
        totalsByCurrency[currency] =
          (totalsByCurrency[currency] ?? 0) + Number(e.amount);
      }

      return { expenses, total, totalsByCurrency };
    }),

  create: publicProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const expense = await createExpenseInternal(ctx.db, input);
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
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.accountId !== undefined)
        updateData.account = { connect: { id: data.accountId } };
      if (data.categoryId !== undefined)
        updateData.category = data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };
      if (data.payingAccountId !== undefined)
        updateData.payingAccount = data.payingAccountId
          ? { connect: { id: data.payingAccountId } }
          : { disconnect: true };
      if (data.paymentDueDate !== undefined)
        updateData.paymentDueDate = data.paymentDueDate;
      if (data.statementId !== undefined)
        updateData.statement = data.statementId
          ? { connect: { id: data.statementId } }
          : { disconnect: true };

      try {
        const expense = await ctx.db.expense.update({
          where: { id },
          data: updateData,
          include: {
            account: { select: { id: true, name: true, currency: true, type: true, color: true } },
            category: { select: { id: true, name: true, color: true, icon: true, monthlyBudget: true } },
            payingAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
          },
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

  markPaid: publicProcedure
    .input(markExpensePaidSchema)
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.db.expense.findUnique({
        where: { id: input.expenseId },
        include: { account: true },
      });

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Expense with ID ${input.expenseId} not found`,
        });
      }

      const updated = await ctx.db.expense.update({
        where: { id: input.expenseId },
        data: { paymentStatus: "PAID" },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true, color: true } },
          category: { select: { id: true, name: true, color: true, icon: true, monthlyBudget: true } },
          payingAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
        },
      });

      // Optionally create a transfer from paying account to credit card
      if (input.createTransfer && expense.payingAccountId) {
        await ctx.db.transfer.create({
          data: {
            name: `CC Payment: ${expense.name}`,
            amount: expense.amount,
            date: new Date(),
            fromAccountId: expense.payingAccountId,
            toAccountId: expense.accountId,
            notes: `Auto-created from expense payment`,
          },
        });
      }

      return serializeExpense(updated);
    }),
});
