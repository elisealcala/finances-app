import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import type { Account as PrismaAccount } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createAccountSchema,
  updateAccountSchema,
  getAccountByIdSchema,
  listAccountsSchema,
  deleteAccountSchema,
} from "../schema";
import { pickNextColor } from "../lib/colors";
import { computeAccountBalance } from "../lib/balance";

function serializeAccount(account: PrismaAccount) {
  return {
    ...account,
    opening: Number(account.opening),
    creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
    apr: account.apr ? Number(account.apr) : null,
  };
}

export const accountRouter = router({
  list: publicProcedure
    .input(listAccountsSchema)
    .query(async ({ ctx, input }) => {
      const {
        type,
        isArchived,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = input ?? {};

      const where: Prisma.AccountWhereInput = {
        ...(type && { type }),
        ...(isArchived !== undefined && { isArchived }),
      };

      const rawAccounts = await ctx.db.account.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
      });

      const accounts = await Promise.all(
        rawAccounts.map(async (account) => {
          const serialized = serializeAccount(account);
          const balance = await computeAccountBalance(
            ctx.db,
            account.id,
            serialized.opening,
          );
          return { ...serialized, balance };
        }),
      );

      return { accounts };
    }),

  getById: publicProcedure
    .input(getAccountByIdSchema)
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { id: input.id },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Account with ID ${input.id} not found`,
        });
      }

      const serialized = serializeAccount(account);
      const balance = await computeAccountBalance(
        ctx.db,
        account.id,
        serialized.opening,
      );
      return { ...serialized, balance };
    }),

  create: publicProcedure
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      let color = input.color ?? null;
      if (!color) {
        const existing = await ctx.db.account.findMany({
          select: { color: true },
        });
        color = pickNextColor(existing.map((a) => a.color));
      }

      let debtId: string | null = null;

      if (input.type === "CREDIT_CARD" && input.linkToDebt) {
        const debt = await ctx.db.debt.create({
          data: {
            name: input.name,
            type: "CREDIT_CARD",
            originalBalance: new Prisma.Decimal(input.creditLimit ?? 0),
            balance: new Prisma.Decimal(input.creditLimit ?? 0),
            interestRate: new Prisma.Decimal(input.apr ?? 0),
            monthlyCapital: new Prisma.Decimal(0),
            monthlyInterest: new Prisma.Decimal(0),
            originalMonthlyCapital: new Prisma.Decimal(0),
            originalMonthlyInterest: new Prisma.Decimal(0),
            minimumPayment: new Prisma.Decimal(0),
            originalMinimumPayment: new Prisma.Decimal(0),
            status: "ACTIVE",
          },
        });
        debtId = debt.id;
      }

      const account = await ctx.db.account.create({
        data: {
          name: input.name,
          type: input.type,
          opening: new Prisma.Decimal(input.opening),
          currency: input.currency ?? "PEN",
          color,
          notes: input.notes ?? null,
          isArchived: input.isArchived ?? false,
          creditLimit: input.creditLimit != null
            ? new Prisma.Decimal(input.creditLimit)
            : null,
          apr: input.apr != null ? new Prisma.Decimal(input.apr) : null,
          billingDay: input.billingDay ?? null,
          paymentDueDay: input.paymentDueDay ?? null,
          debtId,
        },
      });

      const serialized = serializeAccount(account);
      return { ...serialized, balance: serialized.opening };
    }),

  update: publicProcedure
    .input(updateAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, linkToDebt: _linkToDebt, ...data } = input;

      const updateData: Prisma.AccountUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.opening !== undefined)
        updateData.opening = new Prisma.Decimal(data.opening);
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;
      if (data.creditLimit !== undefined)
        updateData.creditLimit =
          data.creditLimit != null
            ? new Prisma.Decimal(data.creditLimit)
            : null;
      if (data.apr !== undefined)
        updateData.apr =
          data.apr != null ? new Prisma.Decimal(data.apr) : null;
      if (data.billingDay !== undefined) updateData.billingDay = data.billingDay;
      if (data.paymentDueDay !== undefined)
        updateData.paymentDueDay = data.paymentDueDay;

      try {
        const account = await ctx.db.account.update({
          where: { id },
          data: updateData,
        });
        const serialized = serializeAccount(account);
        const balance = await computeAccountBalance(
          ctx.db,
          account.id,
          serialized.opening,
        );
        return { ...serialized, balance };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Account with ID ${id} not found`,
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteAccountSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.account.delete({
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
            message: `Account with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
