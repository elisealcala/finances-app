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
          category: { select: { id: true, name: true, color: true, icon: true } },
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
      // Auto-set NOT_PAID for credit card accounts
      let paymentStatus = input.paymentStatus ?? "PAID";
      const account = await ctx.db.account.findUnique({
        where: { id: input.accountId },
        select: { type: true, currency: true, defaultPayingAccountId: true },
      });

      if (paymentStatus === "PAID" && account?.type === "CREDIT_CARD") {
        paymentStatus = "NOT_PAID";
      }

      // Auto-fill payingAccountId from account's default if not provided
      const payingAccountId =
        input.payingAccountId ??
        (account?.type === "CREDIT_CARD"
          ? account.defaultPayingAccountId
          : null);

      // Auto-populate paymentDueDate from statement if linked
      let paymentDueDate = input.paymentDueDate ?? null;
      if (input.statementId && !paymentDueDate) {
        const statement = await ctx.db.creditCardStatement.findUnique({
          where: { id: input.statementId },
          select: { paymentDueDate: true },
        });
        if (statement) {
          paymentDueDate = statement.paymentDueDate;
        }
      }

      const expense = await ctx.db.expense.create({
        data: {
          name: input.name,
          amount: new Prisma.Decimal(input.amount),
          date: input.date,
          paymentStatus,
          currency: input.currency ?? null,
          notes: input.notes ?? null,
          accountId: input.accountId,
          categoryId: input.categoryId ?? null,
          payingAccountId,
          paymentDueDate,
          statementId: input.statementId ?? null,
        },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true, color: true } },
          category: { select: { id: true, name: true, color: true, icon: true } },
          payingAccount: { select: { id: true, name: true, currency: true, type: true, color: true } },
        },
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
            category: { select: { id: true, name: true, color: true, icon: true } },
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
          category: { select: { id: true, name: true, color: true, icon: true } },
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
