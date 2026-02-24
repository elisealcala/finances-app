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
          _count: { select: { expenses: true } },
        },
      });

      const statements = rawStatements.map((s) => ({
        ...serializeStatement(s),
        account: s.account,
        expenseCount: s._count.expenses,
      }));

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

      // Build exchange rate lookup
      const rateMap = new Map<string, number>();
      for (const er of input.exchangeRates) {
        rateMap.set(`${er.fromCurrency}->${er.toCurrency}`, er.rate);
      }

      function getRate(from: Currency, to: Currency): number {
        if (from === to) return 1;
        const rate = rateMap.get(`${from}->${to}`);
        if (rate === undefined) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Missing exchange rate for ${from} -> ${to}. Please provide this rate.`,
          });
        }
        return rate;
      }

      // Group expenses by paying account and compute converted totals
      type GroupData = {
        payingAccountId: string;
        payingAccountName: string;
        totalInPayerCurrency: Prisma.Decimal;
        expenseCount: number;
      };

      const groups = new Map<string, GroupData>();

      for (const expense of expenses) {
        const payerId = expense.payingAccountId!;
        const payerCurrency = expense.payingAccount!.currency;
        const expenseCurrency = expense.currency ?? expense.account.currency;

        const rate = getRate(expenseCurrency, payerCurrency);
        const convertedAmount = expense.amount.mul(new Prisma.Decimal(rate));

        const existing = groups.get(payerId);
        if (existing) {
          existing.totalInPayerCurrency =
            existing.totalInPayerCurrency.add(convertedAmount);
          existing.expenseCount += 1;
        } else {
          groups.set(payerId, {
            payingAccountId: payerId,
            payingAccountName: expense.payingAccount!.name,
            totalInPayerCurrency: convertedAmount,
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

        // Create one transfer per paying account group
        for (const [, group] of groups) {
          await tx.transfer.create({
            data: {
              name: `Statement Payment: ${cardName} ${statement.month}/${statement.year}`,
              amount: group.totalInPayerCurrency,
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
