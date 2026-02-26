import { router, publicProcedure } from "@/server/trpc/init";
import { monthlySummarySchema, periodSummarySchema } from "../schema";

export const overviewRouter = router({
  monthlySummary: publicProcedure
    .input(monthlySummarySchema)
    .query(async ({ ctx, input }) => {
      const { year } = input;
      const months = [];

      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const [incomeAgg, expenseAgg] = await Promise.all([
          ctx.db.income.aggregate({
            where: { date: { gte: startDate, lt: endDate } },
            _sum: { amount: true },
          }),
          ctx.db.expense.aggregate({
            where: { date: { gte: startDate, lt: endDate } },
            _sum: { amount: true },
          }),
        ]);

        const income = Number(incomeAgg._sum.amount ?? 0);
        const expenses = Number(expenseAgg._sum.amount ?? 0);

        months.push({
          month,
          income,
          expenses,
          savings: income - expenses,
        });
      }

      return { months };
    }),

  periodSummary: publicProcedure
    .input(periodSummarySchema)
    .query(async ({ ctx, input }) => {
      const { year, month } = input;
      const startDate = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1);
      const endDate = month
        ? new Date(year, month, 1)
        : new Date(year + 1, 0, 1);

      const [incomeAgg, expenseAgg] = await Promise.all([
        ctx.db.income.aggregate({
          where: { date: { gte: startDate, lt: endDate } },
          _sum: { amount: true },
        }),
        ctx.db.expense.aggregate({
          where: { date: { gte: startDate, lt: endDate } },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = Number(incomeAgg._sum.amount ?? 0);
      const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
      const savings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      // Top categories by expense amount
      const categoryExpenses = await ctx.db.expense.groupBy({
        by: ["categoryId"],
        where: { date: { gte: startDate, lt: endDate }, categoryId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      });

      const categoryIds = categoryExpenses
        .map((c) => c.categoryId)
        .filter((id): id is string => id !== null);
      const categories = await ctx.db.category.findMany({
        where: { id: { in: categoryIds } },
      });
      const catMap = new Map(categories.map((c) => [c.id, c]));

      const topCategories = categoryExpenses.map((ce) => {
        const cat = catMap.get(ce.categoryId!);
        return {
          name: cat?.name ?? "Unknown",
          amount: Number(ce._sum.amount ?? 0),
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
