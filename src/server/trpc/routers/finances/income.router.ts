import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Income as PrismaIncome } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createIncomeSchema,
  updateIncomeSchema,
  listIncomesSchema,
  incomeCategorySummarySchema,
  deleteIncomeSchema,
} from "@/server/trpc/schemas/finances.schema";

const CURRENCY_ORDER = ["PEN", "USD", "EUR"] as const;
type Currency = (typeof CURRENCY_ORDER)[number];

function serializeIncome(income: PrismaIncome & { account?: unknown; category?: unknown }) {
  return {
    ...income,
    amount: Number(income.amount),
  };
}

function isCurrency(value: unknown): value is Currency {
  return CURRENCY_ORDER.includes(value as Currency);
}

function getEffectiveCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : "PEN";
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
        const withRelations = i as unknown as {
          currency?: string | null;
          account?: { currency?: string };
        };
        const currency =
          withRelations.currency ?? withRelations.account?.currency ?? "PEN";
        totalsByCurrency[currency] =
          (totalsByCurrency[currency] ?? 0) + Number(i.amount);
      }

      return { incomes, total, totalsByCurrency };
    }),

  categorySummary: publicProcedure
    .input(incomeCategorySummarySchema)
    .query(async ({ ctx, input }) => {
      const { accountId } = input ?? {};

      const rawIncomes = await ctx.db.income.findMany({
        where: {
          ...(accountId && { accountId }),
        },
        select: {
          amount: true,
          currency: true,
          categoryId: true,
          account: { select: { currency: true } },
          category: { select: { id: true, name: true, color: true } },
        },
      });

      const totalsByCurrency: Record<string, number> = {};
      const grouped = new Map<
        string,
        {
          categoryId: string | null;
          categoryName: string;
          categoryColor: string | null;
          currency: Currency;
          amount: number;
          count: number;
        }
      >();

      for (const income of rawIncomes) {
        const currency = getEffectiveCurrency(
          income.currency ?? income.account?.currency,
        );
        const amount = Number(income.amount);
        totalsByCurrency[currency] = (totalsByCurrency[currency] ?? 0) + amount;

        const categoryId = income.categoryId ?? null;
        const key = `${categoryId ?? "uncategorized"}:${currency}`;
        const current = grouped.get(key);

        if (current) {
          current.amount += amount;
          current.count += 1;
        } else {
          grouped.set(key, {
            categoryId,
            categoryName: income.category?.name ?? "Uncategorized",
            categoryColor: income.category?.color ?? null,
            currency,
            amount,
            count: 1,
          });
        }
      }

      const currencyIndex = new Map(
        CURRENCY_ORDER.map((currency, index) => [currency, index]),
      );

      const rows = Array.from(grouped.values())
        .map((row) => {
          const total = totalsByCurrency[row.currency] ?? 0;
          return {
            ...row,
            amount: Math.round(row.amount * 100) / 100,
            share: total > 0 ? (row.amount / total) * 100 : 0,
          };
        })
        .sort((a, b) => {
          const byCurrency =
            (currencyIndex.get(a.currency) ?? 99) -
            (currencyIndex.get(b.currency) ?? 99);
          if (byCurrency !== 0) return byCurrency;
          if (b.amount !== a.amount) return b.amount - a.amount;
          return a.categoryName.localeCompare(b.categoryName);
        });

      for (const currency of Object.keys(totalsByCurrency)) {
        totalsByCurrency[currency] =
          Math.round(totalsByCurrency[currency] * 100) / 100;
      }

      return { rows, totalsByCurrency };
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
          currency: input.currency ?? null,
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
      if (data.currency !== undefined) updateData.currency = data.currency;
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
