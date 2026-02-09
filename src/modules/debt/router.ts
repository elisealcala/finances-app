import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Debt } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createDebtSchema,
  updateDebtSchema,
  getDebtByIdSchema,
  listDebtsSchema,
  deleteDebtSchema,
} from "./schema";
import { pickNextColor } from "./lib/colors";

/** Convert Prisma Decimal fields to plain numbers for client serialization */
function serializeDebt(debt: Debt) {
  return {
    ...debt,
    balance: Number(debt.balance),
    interestRate: Number(debt.interestRate),
    minimumPayment: Number(debt.minimumPayment),
  };
}

export const debtRouter = router({
  list: publicProcedure.input(listDebtsSchema).query(async ({ ctx, input }) => {
    const {
      status,
      type,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = input ?? {};

    const where: Prisma.DebtWhereInput = {
      ...(status && { status }),
      ...(type && { type }),
    };

    const rawDebts = await ctx.db.debt.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    const debts = rawDebts.map(serializeDebt);

    const activeDebts = debts.filter((d) => d.status === "ACTIVE");
    const summary = {
      totalDebt: activeDebts.reduce((sum, d) => sum + d.balance, 0),
      totalMinimumPayment: activeDebts.reduce(
        (sum, d) => sum + d.minimumPayment,
        0,
      ),
      averageInterestRate:
        activeDebts.length > 0
          ? activeDebts.reduce((sum, d) => sum + d.interestRate, 0) /
            activeDebts.length
          : 0,
      activeCount: activeDebts.length,
      paidOffCount: debts.filter((d) => d.status === "PAID_OFF").length,
    };

    return { debts, summary };
  }),

  getById: publicProcedure
    .input(getDebtByIdSchema)
    .query(async ({ ctx, input }) => {
      const debt = await ctx.db.debt.findUnique({
        where: { id: input.id },
      });

      if (!debt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Debt with ID ${input.id} not found`,
        });
      }

      return serializeDebt(debt);
    }),

  create: publicProcedure
    .input(createDebtSchema)
    .mutation(async ({ ctx, input }) => {
      let color = input.color ?? null;
      if (!color) {
        const existing = await ctx.db.debt.findMany({ select: { color: true } });
        color = pickNextColor(existing.map((d) => d.color));
      }

      const debt = await ctx.db.debt.create({
        data: {
          name: input.name,
          type: input.type,
          balance: new Prisma.Decimal(input.balance),
          interestRate: new Prisma.Decimal(input.interestRate),
          minimumPayment: new Prisma.Decimal(input.minimumPayment),
          dueDate: input.dueDate ?? null,
          lender: input.lender ?? null,
          notes: input.notes ?? null,
          color,
          startedAt: input.startedAt ?? null,
          status: input.status ?? "ACTIVE",
        },
      });
      return serializeDebt(debt);
    }),

  update: publicProcedure
    .input(updateDebtSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Prisma.DebtUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.balance !== undefined)
        updateData.balance = new Prisma.Decimal(data.balance);
      if (data.interestRate !== undefined)
        updateData.interestRate = new Prisma.Decimal(data.interestRate);
      if (data.minimumPayment !== undefined)
        updateData.minimumPayment = new Prisma.Decimal(data.minimumPayment);
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
      if (data.lender !== undefined) updateData.lender = data.lender;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.startedAt !== undefined) updateData.startedAt = data.startedAt;

      try {
        const debt = await ctx.db.debt.update({
          where: { id },
          data: updateData,
        });
        return serializeDebt(debt);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Debt with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteDebtSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.debt.delete({
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
            message: `Debt with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
