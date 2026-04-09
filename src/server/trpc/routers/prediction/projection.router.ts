import { router, publicProcedure } from "@/server/trpc/init";
import {
  accountAvailableSchema,
  cashFlowSchema,
  upcomingSchema,
} from "@/server/trpc/schemas/prediction.schema";
import {
  computeAvailableBalance,
  computeAllAvailableBalances,
} from "@/server/trpc/services/prediction/available-balance";
import { projectCashFlow } from "@/server/trpc/services/prediction/cash-flow";
import { generateAlerts } from "@/server/trpc/services/prediction/alerts";
import { getUpcomingObligations } from "@/server/trpc/services/prediction/upcoming";
import { computeAccountBalance } from "@/lib/balance";
import { TRPCError } from "@trpc/server";

export const projectionRouter = router({
  availableBalances: publicProcedure.query(async ({ ctx }) => {
    return computeAllAvailableBalances(ctx.db);
  }),

  accountAvailable: publicProcedure
    .input(accountAvailableSchema)
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findUnique({
        where: { id: input.accountId },
      });
      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Account with ID ${input.accountId} not found`,
        });
      }

      const balance = await computeAccountBalance(
        ctx.db,
        account.id,
        Number(account.opening),
        account.type,
      );

      const result = await computeAvailableBalance(
        ctx.db,
        account.id,
        balance,
      );

      return {
        accountId: account.id,
        accountName: account.name,
        currency: account.currency,
        balance,
        ...result,
      };
    }),

  cashFlow: publicProcedure
    .input(cashFlowSchema)
    .query(async ({ ctx, input }) => {
      const months = input?.months ?? 6;
      return projectCashFlow(ctx.db, months);
    }),

  alerts: publicProcedure.query(async ({ ctx }) => {
    return generateAlerts(ctx.db);
  }),

  upcoming: publicProcedure
    .input(upcomingSchema)
    .query(async ({ ctx, input }) => {
      const daysAhead = input?.daysAhead ?? 30;
      return getUpcomingObligations(ctx.db, daysAhead);
    }),

  spendingRoom: publicProcedure.query(async ({ ctx }) => {
    const balances = await computeAllAvailableBalances(ctx.db);

    return balances.map((ab) => ({
      accountId: ab.accountId,
      accountName: ab.accountName,
      currency: ab.currency,
      balance: ab.balance,
      committed: ab.committed,
      room: Math.max(0, ab.available),
    }));
  }),
});
