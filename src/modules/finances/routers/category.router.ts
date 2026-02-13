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
});
