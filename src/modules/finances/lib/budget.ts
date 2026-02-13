import type { PrismaClient } from "@/generated/prisma/client";
import type { BudgetStatus } from "../types";

/** Compute budget vs actual spend per category for a given month */
export async function computeBudgetStatus(
  db: PrismaClient,
  year: number,
  month: number,
): Promise<BudgetStatus[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const categories = await db.category.findMany({
    where: {
      isArchived: false,
      monthlyBudget: { not: null },
    },
  });

  const results: BudgetStatus[] = [];

  for (const cat of categories) {
    const budget = Number(cat.monthlyBudget ?? 0);
    const agg = await db.expense.aggregate({
      where: {
        categoryId: cat.id,
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    });
    const spent = Number(agg._sum.amount ?? 0);

    results.push({
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      budget,
      spent,
      remaining: budget - spent,
      percentUsed: budget > 0 ? (spent / budget) * 100 : 0,
    });
  }

  return results;
}
