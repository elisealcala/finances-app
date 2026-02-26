import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Category as PrismaCategory } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
  deleteCategorySchema,
  periodSummarySchema,
  categorySummarySchema,
} from "../schema";
import { pickNextColor } from "../lib/colors";
import { computeBudgetStatus } from "../lib/budget";

function serializeCategory(category: PrismaCategory) {
  return {
    ...category,
    monthlyBudget: category.monthlyBudget
      ? Number(category.monthlyBudget)
      : null,
  };
}

export const categoryRouter = router({
  list: publicProcedure
    .input(listCategoriesSchema)
    .query(async ({ ctx, input }) => {
      const { isArchived } = input ?? {};

      const where: Prisma.CategoryWhereInput = {
        ...(isArchived !== undefined && { isArchived }),
      };

      const rawCategories = await ctx.db.category.findMany({
        where,
        orderBy: { name: "asc" },
      });

      return { categories: rawCategories.map(serializeCategory) };
    }),

  create: publicProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      let color = input.color ?? null;
      if (!color) {
        const existing = await ctx.db.category.findMany({
          select: { color: true },
        });
        color = pickNextColor(existing.map((c) => c.color));
      }

      const category = await ctx.db.category.create({
        data: {
          name: input.name,
          monthlyBudget:
            input.monthlyBudget != null
              ? new Prisma.Decimal(input.monthlyBudget)
              : null,
          color,
          icon: input.icon ?? null,
          isArchived: input.isArchived ?? false,
        },
      });
      return serializeCategory(category);
    }),

  update: publicProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.CategoryUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.monthlyBudget !== undefined)
        updateData.monthlyBudget =
          data.monthlyBudget != null
            ? new Prisma.Decimal(data.monthlyBudget)
            : null;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

      try {
        const category = await ctx.db.category.update({
          where: { id },
          data: updateData,
        });
        return serializeCategory(category);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Category with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.category.delete({
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
            message: `Category with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),

  budgetStatus: publicProcedure
    .input(periodSummarySchema)
    .query(async ({ ctx, input }) => {
      return computeBudgetStatus(ctx.db, input.year, input.month);
    }),

  summary: publicProcedure
    .input(categorySummarySchema)
    .query(async ({ ctx, input }) => {
      const { year, month, accountId } = input;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const categories = await ctx.db.category.findMany({
        where: { isArchived: false },
        orderBy: { name: "asc" },
      });

      const expenseWhere: Prisma.ExpenseWhereInput = {
        date: { gte: startDate, lt: endDate },
        ...(accountId && { accountId }),
      };

      const expenses = await ctx.db.expense.findMany({
        where: expenseWhere,
        select: {
          amount: true,
          currency: true,
          categoryId: true,
          account: { select: { currency: true } },
        },
      });

      // Build per-category totals by currency
      const spentMap = new Map<
        string | null,
        Record<string, number>
      >();
      for (const e of expenses) {
        const currency = e.currency ?? e.account.currency ?? "PEN";
        const key = e.categoryId;
        const current = spentMap.get(key) ?? {};
        current[currency] = (current[currency] ?? 0) + Number(e.amount);
        spentMap.set(key, current);
      }

      const uncategorizedByCurrency = spentMap.get(null) ?? {};

      const items = categories.map((cat) => {
        const spentByCurrency = spentMap.get(cat.id) ?? {};
        const totalSpent = Object.values(spentByCurrency).reduce(
          (sum, v) => sum + v,
          0,
        );
        const budget = Number(cat.monthlyBudget ?? 0);
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          color: cat.color,
          monthlyBudget: budget > 0 ? budget : null,
          spent: totalSpent,
          spentByCurrency,
          remaining: budget > 0 ? budget - totalSpent : null,
          percentUsed: budget > 0 ? (totalSpent / budget) * 100 : null,
        };
      });

      return { items, uncategorizedByCurrency };
    }),
});
