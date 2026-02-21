import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createFundingLinkSchema,
  deleteFundingLinkSchema,
  listFundingLinksSchema,
} from "../schema";

export const fundingRouter = router({
  list: publicProcedure
    .input(listFundingLinksSchema)
    .query(async ({ ctx, input }) => {
      const { accountId, debtId } = input ?? {};

      const where: Prisma.FundingLinkWhereInput = {
        ...(accountId && { sourceAccountId: accountId }),
        ...(debtId && { debtId }),
      };

      const items = await ctx.db.fundingLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          sourceAccount: { select: { id: true, name: true, currency: true } },
          debt: { select: { id: true, name: true, minimumPayment: true } },
        },
      });

      return {
        items: items.map((item) => ({
          ...item,
          debt: {
            ...item.debt,
            minimumPayment: Number(item.debt.minimumPayment),
          },
        })),
      };
    }),

  listForAccount: publicProcedure
    .input(listFundingLinksSchema)
    .query(async ({ ctx, input }) => {
      const { accountId } = input ?? {};
      if (!accountId) return { items: [] };

      const items = await ctx.db.fundingLink.findMany({
        where: { sourceAccountId: accountId },
        include: {
          debt: { select: { id: true, name: true, minimumPayment: true } },
        },
      });

      return {
        items: items.map((item) => ({
          ...item,
          debt: {
            ...item.debt,
            minimumPayment: Number(item.debt.minimumPayment),
          },
        })),
      };
    }),

  create: publicProcedure
    .input(createFundingLinkSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const item = await ctx.db.fundingLink.create({
          data: {
            sourceAccountId: input.sourceAccountId,
            debtId: input.debtId,
            notes: input.notes ?? null,
          },
        });
        return item;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This account is already linked to this debt",
          });
        }
        throw error;
      }
    }),

  delete: publicProcedure
    .input(deleteFundingLinkSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.fundingLink.delete({
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
            message: `Funding link with ID ${input.id} not found`,
          });
        }
        throw error;
      }
    }),
});
