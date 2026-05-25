import { router, publicProcedure } from "@/server/trpc/init";
import {
  monthlySummarySchema,
  periodSummarySchema,
} from "@/server/trpc/schemas/finances.schema";
import type { Currency } from "@/generated/prisma/client";

/**
 * An income/expense row's effective currency is its own `currency` column,
 * or its account's currency if that's null. We can't express this as a single
 * `groupBy` in Prisma, so filtering happens via an OR clause that matches
 * either branch.
 */
function effectiveCurrencyFilter(currency: Currency) {
  return {
    OR: [{ currency }, { currency: null, account: { currency } }],
  };
}

export const overviewRouter = router({
  monthlySummary: publicProcedure
    .input(monthlySummarySchema)
    .query(async ({ ctx, input }) => {
      const { year, currency } = input;
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);

      const [incomes, expenses] = await Promise.all([
        ctx.db.income.findMany({
          where: {
            date: { gte: startDate, lt: endDate },
            ...effectiveCurrencyFilter(currency),
          },
          select: { date: true, amount: true },
        }),
        ctx.db.expense.findMany({
          where: {
            date: { gte: startDate, lt: endDate },
            ...effectiveCurrencyFilter(currency),
          },
          select: { date: true, amount: true },
        }),
      ]);

      const byMonth = new Map<number, { income: number; expenses: number }>();
      for (let m = 1; m <= 12; m++) byMonth.set(m, { income: 0, expenses: 0 });

      for (const i of incomes) {
        const slot = byMonth.get(i.date.getMonth() + 1)!;
        slot.income += Number(i.amount);
      }
      for (const e of expenses) {
        const slot = byMonth.get(e.date.getMonth() + 1)!;
        slot.expenses += Number(e.amount);
      }

      const months = Array.from(byMonth.entries()).map(([month, v]) => ({
        month,
        income: v.income,
        expenses: v.expenses,
        savings: v.income - v.expenses,
      }));

      return { months };
    }),

  periodSummary: publicProcedure
    .input(periodSummarySchema)
    .query(async ({ ctx, input }) => {
      const { year, month, currency } = input;
      const startDate = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1);
      const endDate = month
        ? new Date(year, month, 1)
        : new Date(year + 1, 0, 1);

      const [incomes, expenses] = await Promise.all([
        ctx.db.income.findMany({
          where: {
            date: { gte: startDate, lt: endDate },
            ...effectiveCurrencyFilter(currency),
          },
          select: { amount: true },
        }),
        ctx.db.expense.findMany({
          where: {
            date: { gte: startDate, lt: endDate },
            ...effectiveCurrencyFilter(currency),
          },
          select: { amount: true, categoryId: true },
        }),
      ]);

      const totalIncome = incomes.reduce(
        (s, i) => s + Number(i.amount),
        0,
      );
      const totalExpenses = expenses.reduce(
        (s, e) => s + Number(e.amount),
        0,
      );
      const savings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      const byCategory = new Map<string, number>();
      for (const e of expenses) {
        if (!e.categoryId) continue;
        byCategory.set(
          e.categoryId,
          (byCategory.get(e.categoryId) ?? 0) + Number(e.amount),
        );
      }
      const sortedEntries = Array.from(byCategory.entries()).sort(
        (a, b) => b[1] - a[1],
      );

      const categoryIds = sortedEntries.map(([id]) => id);
      const categories = categoryIds.length
        ? await ctx.db.category.findMany({
            where: { id: { in: categoryIds } },
          })
        : [];
      const catMap = new Map(categories.map((c) => [c.id, c]));

      const topCategories = sortedEntries.map(([id, amount]) => {
        const cat = catMap.get(id);
        return {
          name: cat?.name ?? "Unknown",
          amount,
          color: cat?.color ?? null,
        };
      });

      return {
        totalIncome,
        totalExpenses,
        savings,
        savingsRate,
        topCategories,
      };
    }),
});
