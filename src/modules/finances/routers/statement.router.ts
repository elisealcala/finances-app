import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { CreditCardStatement as PrismaStatement } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import type { Currency } from "@/generated/prisma/client";
import {
  createStatementSchema,
  updateStatementSchema,
  listStatementsSchema,
  getStatementByIdSchema,
  deleteStatementSchema,
  closeStatementSchema,
  payStatementSchema,
} from "../schema";

function serializeStatement(statement: PrismaStatement) {
  return {
    ...statement,
    totalAmount: statement.totalAmount ? Number(statement.totalAmount) : null,
  };
}

export const statementRouter = router({
  list: publicProcedure
    .input(listStatementsSchema)
    .query(async ({ ctx, input }) => {
      const { accountId, year, status, sortOrder = "desc" } = input ?? {};

      const where: Prisma.CreditCardStatementWhereInput = {};
      if (accountId) where.accountId = accountId;
      if (year) where.year = year;
      if (status) where.status = status;

      const rawStatements = await ctx.db.creditCardStatement.findMany({
        where,
        orderBy: [{ year: sortOrder }, { month: sortOrder }],
        include: {
          account: {
            select: { id: true, name: true, currency: true, color: true },
          },
          expenses: {
            select: { amount: true, currency: true },
          },
          _count: { select: { expenses: true } },
        },
      });

      const statements = rawStatements.map((s) => {
        const totalsByCurrency: Record<string, number> = {};
        for (const e of s.expenses) {
          const cur = e.currency ?? s.account.currency;
          totalsByCurrency[cur] = (totalsByCurrency[cur] ?? 0) + Number(e.amount);
        }

        const { expenses: _expenses, _count, ...rest } = s;
        return {
          ...serializeStatement(rest),
          account: s.account,
          expenseCount: _count.expenses,
          totalsByCurrency,
        };
      });

      return { statements };
    }),

  getById: publicProcedure
    .input(getStatementByIdSchema)
    .query(async ({ ctx, input }) => {
      const statement = await ctx.db.creditCardStatement.findUnique({
        where: { id: input.id },
        include: {
          account: {
            select: { id: true, name: true, currency: true, color: true },
          },
          expenses: {
            include: {
              category: {
                select: { id: true, name: true, color: true, icon: true },
              },
              payingAccount: {
                select: { id: true, name: true, currency: true, type: true, color: true },
              },
            },
            orderBy: { date: "desc" },
          },
        },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Statement with ID ${input.id} not found`,
        });
      }

      return {
        ...serializeStatement(statement),
        account: statement.account,
        expenses: statement.expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
        })),
      };
    }),

  create: publicProcedure
    .input(createStatementSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate account is a credit card
      const account = await ctx.db.account.findUnique({
        where: { id: input.accountId },
        select: { type: true },
      });

      if (!account || account.type !== "CREDIT_CARD") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Statements can only be created for credit card accounts",
        });
      }

      const statement = await ctx.db.creditCardStatement.create({
        data: {
          accountId: input.accountId,
          month: input.month,
          year: input.year,
          billingCloseDate: input.billingCloseDate,
          paymentDueDate: input.paymentDueDate,
          notes: input.notes ?? null,
        },
      });

      return serializeStatement(statement);
    }),

  update: publicProcedure
    .input(updateStatementSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.CreditCardStatementUpdateInput = {};
      if (data.billingCloseDate !== undefined)
        updateData.billingCloseDate = data.billingCloseDate;
      if (data.paymentDueDate !== undefined)
        updateData.paymentDueDate = data.paymentDueDate;
      if (data.totalAmount !== undefined)
        updateData.totalAmount =
          data.totalAmount != null
            ? new Prisma.Decimal(data.totalAmount)
            : null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      try {
        const statement = await ctx.db.creditCardStatement.update({
          where: { id },
          data: updateData,
        });
        return serializeStatement(statement);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Statement with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  close: publicProcedure
    .input(closeStatementSchema)
    .mutation(async ({ ctx, input }) => {
      // Compute total from linked expenses
      const expenses = await ctx.db.expense.findMany({
        where: { statementId: input.id },
        select: { amount: true },
      });

      const total = expenses.reduce(
        (sum, e) => sum.add(e.amount),
        new Prisma.Decimal(0),
      );

      const statement = await ctx.db.creditCardStatement.update({
        where: { id: input.id },
        data: {
          status: "CLOSED",
          totalAmount: total,
        },
      });

      return serializeStatement(statement);
    }),

  pay: publicProcedure
    .input(payStatementSchema)
    .mutation(async ({ ctx, input }) => {
      const statement = await ctx.db.creditCardStatement.findUnique({
        where: { id: input.id },
        include: {
          account: { select: { id: true, name: true, currency: true } },
        },
      });

      if (!statement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Statement with ID ${input.id} not found`,
        });
      }

      if (statement.status !== "CLOSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Statement must be CLOSED before it can be paid",
        });
      }

      const expenses = await ctx.db.expense.findMany({
        where: {
          statementId: input.id,
          paymentStatus: "NOT_PAID",
        },
        include: {
          account: { select: { id: true, currency: true } },
          payingAccount: { select: { id: true, name: true, currency: true } },
        },
      });

      // No unpaid expenses — just transition status
      if (expenses.length === 0) {
        const updated = await ctx.db.creditCardStatement.update({
          where: { id: input.id },
          data: { status: "PAID" },
        });
        return serializeStatement(updated);
      }

      // Validate all expenses have a paying account
      const withoutPayer = expenses.filter((e) => !e.payingAccountId);
      if (withoutPayer.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${withoutPayer.length} expense(s) do not have a paying account assigned. Please assign a paying account to all expenses before paying the statement.`,
        });
      }

      // Group expenses by (paying account, expense currency) and sum raw amounts
      type GroupData = {
        payingAccountId: string;
        payingAccountName: string;
        currency: Currency;
        total: Prisma.Decimal;
        expenseCount: number;
      };

      const groups = new Map<string, GroupData>();

      for (const expense of expenses) {
        const payerId = expense.payingAccountId!;
        const expenseCurrency = expense.currency ?? expense.account.currency;
        const groupKey = `${payerId}::${expenseCurrency}`;

        const existing = groups.get(groupKey);
        if (existing) {
          existing.total = existing.total.add(expense.amount);
          existing.expenseCount += 1;
        } else {
          groups.set(groupKey, {
            payingAccountId: payerId,
            payingAccountName: expense.payingAccount!.name,
            currency: expenseCurrency,
            total: expense.amount,
            expenseCount: 1,
          });
        }
      }

      const creditCardAccountId = statement.accountId;
      const cardName = statement.account.name;

      const result = await ctx.db.$transaction(async (tx) => {
        // Mark all expenses as paid
        await tx.expense.updateMany({
          where: {
            statementId: input.id,
            paymentStatus: "NOT_PAID",
          },
          data: { paymentStatus: "PAID" },
        });

        // Create one transfer per (paying account, currency) group
        for (const [, group] of groups) {
          await tx.transfer.create({
            data: {
              name: `Statement Payment: ${cardName} ${statement.month}/${statement.year}`,
              amount: group.total,
              currency: group.currency,
              date: input.paymentDate,
              fromAccountId: group.payingAccountId,
              toAccountId: creditCardAccountId,
              notes: `Auto-created from statement payment. ${group.expenseCount} expense(s).`,
            },
          });
        }

        // Update statement status
        const updated = await tx.creditCardStatement.update({
          where: { id: input.id },
          data: { status: "PAID" },
        });

        return updated;
      });

      return serializeStatement(result);
    }),

  delete: publicProcedure
    .input(deleteStatementSchema)
    .mutation(async ({ ctx, input }) => {
      // Unlink expenses before deleting
      await ctx.db.expense.updateMany({
        where: { statementId: input.id },
        data: { statementId: null },
      });

      try {
        await ctx.db.creditCardStatement.delete({
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
            message: `Statement with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
