import { router, publicProcedure } from "@/server/trpc/init";
import { TRPCError } from "@trpc/server";
import type { PendingImport } from "@/generated/prisma/client";
import {
  listImportsSchema,
  confirmImportSchema,
  dismissImportSchema,
  updatePollSettingsSchema,
  backfillSchema,
} from "@/server/trpc/schemas/imports.schema";
import { createExpenseInternal } from "@/server/trpc/services/finances/expense";
import { pollGmail } from "@/server/gmail/poll";

function serializePendingImport<T extends PendingImport>(row: T) {
  return { ...row, amount: Number(row.amount) };
}

export const importsRouter = router({
  list: publicProcedure.input(listImportsSchema).query(async ({ ctx, input }) => {
    const status = input?.status ?? "PENDING";
    const rows = await ctx.db.pendingImport.findMany({
      where: { status },
      orderBy: { emailDate: "desc" },
      include: {
        account: {
          select: { id: true, name: true, type: true, currency: true, color: true },
        },
      },
    });
    return rows.map(serializePendingImport);
  }),

  pendingCount: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.pendingImport.count({ where: { status: "PENDING" } });
  }),

  status: publicProcedure.query(async ({ ctx }) => {
    const cred = await ctx.db.gmailCredential.findFirst({
      select: {
        email: true,
        lastPolledAt: true,
        pollWindowDays: true,
        lastPollResult: true,
      },
    });
    const pending = await ctx.db.pendingImport.count({
      where: { status: "PENDING" },
    });
    return {
      connected: cred !== null,
      email: cred?.email ?? null,
      lastPolledAt: cred?.lastPolledAt ?? null,
      pollWindowDays: cred?.pollWindowDays ?? 7,
      lastPollResult: cred?.lastPollResult ?? null,
      pending,
    };
  }),

  confirm: publicProcedure
    .input(confirmImportSchema)
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.pendingImport.findUnique({
        where: { id: input.id },
      });
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Pending import ${input.id} not found`,
        });
      }
      if (row.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Import is already ${row.status.toLowerCase()}`,
        });
      }

      const accountId = input.accountId ?? row.accountId;
      if (!accountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An account is required to confirm this import",
        });
      }

      const expense = await createExpenseInternal(ctx.db, {
        name: row.merchant,
        amount: Number(row.amount),
        date: row.transactionDate,
        currency: row.currency,
        accountId,
        categoryId: input.categoryId ?? null,
        payingAccountId: input.payingAccountId ?? null,
      });

      await ctx.db.pendingImport.update({
        where: { id: row.id },
        data: { status: "IMPORTED", importedExpenseId: expense.id, accountId },
      });

      return { success: true, expenseId: expense.id };
    }),

  dismiss: publicProcedure
    .input(dismissImportSchema)
    .mutation(async ({ ctx, input }) => {
      // Hard delete so the email can be re-imported on the next poll if it's still in range.
      await ctx.db.pendingImport.delete({ where: { id: input.id } });
      return { success: true };
    }),

  pollNow: publicProcedure.mutation(async () => {
    return pollGmail();
  }),

  backfill: publicProcedure
    .input(backfillSchema)
    .mutation(async ({ input }) => {
      if (input.from > input.to) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "'From' date must be on or before 'To' date",
        });
      }
      return pollGmail({ from: input.from, to: input.to });
    }),

  updateSettings: publicProcedure
    .input(updatePollSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const cred = await ctx.db.gmailCredential.findFirst({ select: { id: true } });
      if (!cred) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connect Gmail before updating poll settings.",
        });
      }
      await ctx.db.gmailCredential.update({
        where: { id: cred.id },
        data: { pollWindowDays: input.pollWindowDays },
      });
      return { success: true };
    }),

  disconnect: publicProcedure.mutation(async ({ ctx }) => {
    await ctx.db.gmailCredential.deleteMany();
    return { success: true };
  }),
});
