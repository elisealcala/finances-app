import { router, publicProcedure } from "@/server/trpc/init";
import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createDebtSchema,
  updateDebtSchema,
  getDebtByIdSchema,
  listDebtsSchema,
  deleteDebtSchema,
  addPaymentSchema,
  deletePaymentSchema,
  markInstallmentPaidSchema,
  markInstallmentUnpaidSchema,
  addScheduleCapitalPaymentSchema,
} from "./schema";
import { pickNextColor } from "./utils/colors";
import { computeCurrentBalance, totalMonthlyFees } from "./utils/amortization";
import { generateEqualPaymentSchedule } from "./utils/schedule";
import {
  serializeDebt,
  recomputeBalance,
  deriveCurrentBreakdown,
  parseFees,
  computeScheduleBalance,
} from "./utils/balance";
import {
  recordDebtPaymentExpense,
  recordDebtFreePaymentExpense,
} from "@/modules/prediction/lib/sync";

const includePayments = { payments: { orderBy: { date: "desc" as const } } };

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
      include: includePayments,
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
        include: {
          ...includePayments,
          installments: { orderBy: { installmentNumber: "asc" } },
        },
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
      const { capitalPayments, fees, installments, fundingAccountId, ...debtData } = input;
      const totalPaid = (capitalPayments ?? []).reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      if (totalPaid > debtData.balance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total payments cannot exceed the debt balance",
        });
      }

      let color = debtData.color ?? null;
      if (!color) {
        const existing = await ctx.db.debt.findMany({
          select: { color: true },
        });
        color = pickNextColor(existing.map((d) => d.color));
      }

      const hasSchedule = debtData.hasSchedule && !!installments?.length;

      // For scheduled debts, derive monthly values from installment #1
      const firstInst = hasSchedule ? installments![0] : null;
      const monthlyCapital = firstInst?.capital ?? debtData.monthlyCapital;
      const monthlyInterest = firstInst?.interest ?? debtData.monthlyInterest;

      const feeTotal = hasSchedule
        ? totalMonthlyFees(firstInst?.fees)
        : totalMonthlyFees(fees);
      const origMinPayment = monthlyCapital + monthlyInterest + feeTotal;

      let currentBalance: number;
      let status: "ACTIVE" | "PAID_OFF";

      if (hasSchedule) {
        // For scheduled debts, balance = originalBalance (all installments PENDING)
        currentBalance = debtData.balance;
        status = debtData.status ?? "ACTIVE";
      } else {
        // Build newMinimumPayment for each capital payment from its breakdown
        const capPaymentsForCalc = (capitalPayments ?? []).map((p) => {
          const pFeeTotal = p.newFees?.length
            ? totalMonthlyFees(p.newFees)
            : totalMonthlyFees(fees);
          return {
            amount: p.amount,
            date: p.date,
            newMinimumPayment:
              p.newMonthlyCapital != null && p.newMonthlyInterest != null
                ? (p.newMonthlyCapital + p.newMonthlyInterest + pFeeTotal)
                : null,
            newFeeTotal: p.newFees?.length ? pFeeTotal : null,
          };
        });

        currentBalance = computeCurrentBalance(
          debtData.balance,
          debtData.interestRate,
          origMinPayment,
          debtData.startedAt ?? null,
          capPaymentsForCalc,
          fees,
        );
        status = currentBalance <= 0 ? "PAID_OFF" : (debtData.status ?? "ACTIVE");
      }

      // Derive the latest capital/interest/fees from payments
      const sortedCapPayments = [...(capitalPayments ?? [])].sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );
      let currentCapital = monthlyCapital;
      let currentInterest = monthlyInterest;
      let currentFees = hasSchedule ? (firstInst?.fees ?? fees) : fees;
      for (const p of sortedCapPayments) {
        if (p.newMonthlyCapital != null && p.newMonthlyInterest != null) {
          currentCapital = p.newMonthlyCapital;
          currentInterest = p.newMonthlyInterest;
        }
        if (p.newFees?.length) {
          currentFees = p.newFees;
        }
      }
      const currentFeeTotal = totalMonthlyFees(currentFees);
      const currentMinPayment = currentCapital + currentInterest + currentFeeTotal;

      const debt = await ctx.db.$transaction(async (tx) => {
        const created = await tx.debt.create({
          data: {
            name: debtData.name,
            type: debtData.type,
            originalBalance: new Prisma.Decimal(debtData.balance),
            balance: new Prisma.Decimal(currentBalance),
            interestRate: new Prisma.Decimal(debtData.interestRate),
            monthlyCapital: new Prisma.Decimal(currentCapital),
            monthlyInterest: new Prisma.Decimal(currentInterest),
            originalMonthlyCapital: new Prisma.Decimal(monthlyCapital),
            originalMonthlyInterest: new Prisma.Decimal(monthlyInterest),
            minimumPayment: new Prisma.Decimal(currentMinPayment),
            originalMinimumPayment: new Prisma.Decimal(origMinPayment),
            dueDate: debtData.dueDate ?? null,
            lender: debtData.lender ?? null,
            notes: debtData.notes ?? null,
            color,
            fees: fees?.length ? fees : Prisma.JsonNull,
            startedAt: debtData.startedAt ?? null,
            status,
            hasSchedule,
            termMonths: hasSchedule ? (debtData.termMonths ?? installments!.length) : (debtData.termMonths ?? null),
          },
        });

        if (capitalPayments?.length) {
          await tx.debtPayment.createMany({
            data: capitalPayments.map((p) => {
              const hasBreakdown =
                p.newMonthlyCapital != null && p.newMonthlyInterest != null;
              const pFeeTotal = p.newFees?.length
                ? totalMonthlyFees(p.newFees)
                : totalMonthlyFees(fees);
              return {
                amount: new Prisma.Decimal(p.amount),
                date: p.date,
                notes: p.notes ?? null,
                newMonthlyCapital: hasBreakdown
                  ? new Prisma.Decimal(p.newMonthlyCapital!)
                  : null,
                newMonthlyInterest: hasBreakdown
                  ? new Prisma.Decimal(p.newMonthlyInterest!)
                  : null,
                newMinimumPayment: hasBreakdown
                  ? new Prisma.Decimal(
                      p.newMonthlyCapital! + p.newMonthlyInterest! + pFeeTotal,
                    )
                  : null,
                newFees: p.newFees?.length ? p.newFees : Prisma.JsonNull,
                debtId: created.id,
              };
            }),
          });
        }

        if (hasSchedule && installments!.length) {
          await tx.debtInstallment.createMany({
            data: installments!.map((inst) => {
              const instFeeTotal = totalMonthlyFees(inst.fees);
              return {
                installmentNumber: inst.installmentNumber,
                dueDate: inst.dueDate,
                capital: new Prisma.Decimal(inst.capital),
                interest: new Prisma.Decimal(inst.interest),
                fees: inst.fees?.length ? inst.fees : Prisma.JsonNull,
                totalAmount: new Prisma.Decimal(
                  Math.round((inst.capital + inst.interest + instFeeTotal) * 100) / 100,
                ),
                notes: inst.notes ?? null,
                debtId: created.id,
              };
            }),
          });
        }

        return tx.debt.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            ...includePayments,
            ...(hasSchedule && { installments: { orderBy: { installmentNumber: "asc" } } }),
          },
        });
      });

      // Create FundingLink and RecurringTransaction if funding account specified
      if (fundingAccountId) {
        await ctx.db.fundingLink.create({
          data: {
            sourceAccountId: fundingAccountId,
            debtId: debt.id,
          },
        });

        const paymentAmount = hasSchedule && installments?.length
          ? installments[0].capital + installments[0].interest + (installments[0].fees?.reduce((s, f) => s + f.amount, 0) ?? 0)
          : currentMinPayment;

        await ctx.db.recurringTransaction.create({
          data: {
            name: `${debtData.name} payment`,
            amount: new Prisma.Decimal(paymentAmount),
            type: "EXPENSE",
            frequency: "MONTHLY",
            dayOfMonth: debtData.dueDate ?? null,
            startDate: new Date(),
            isActive: true,
            accountId: fundingAccountId,
            debtId: debt.id,
          },
        });
      }

      return serializeDebt(debt);
    }),

  update: publicProcedure
    .input(updateDebtSchema)
    .mutation(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, capitalPayments, fees, ...data } = input;

      const currentDebt = await ctx.db.debt.findUnique({
        where: { id },
        include: includePayments,
      });
      if (!currentDebt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Debt with ID ${id} not found`,
        });
      }

      const updateData: Prisma.DebtUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.balance !== undefined)
        updateData.originalBalance = new Prisma.Decimal(data.balance);
      if (data.interestRate !== undefined)
        updateData.interestRate = new Prisma.Decimal(data.interestRate);
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
      if (data.lender !== undefined) updateData.lender = data.lender;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.startedAt !== undefined) updateData.startedAt = data.startedAt;
      if (fees !== undefined)
        updateData.fees = fees?.length ? fees : Prisma.JsonNull;

      // Handle monthly payment breakdown changes
      const breakdownChanged =
        data.monthlyCapital !== undefined ||
        data.monthlyInterest !== undefined;

      if (breakdownChanged) {
        const newCapital =
          data.monthlyCapital ?? Number(currentDebt.originalMonthlyCapital);
        const newInterest =
          data.monthlyInterest ?? Number(currentDebt.originalMonthlyInterest);
        const feeTotal = totalMonthlyFees(
          fees !== undefined
            ? (fees?.length ? fees : [])
            : parseFees(currentDebt.fees),
        );
        const newMinPayment = newCapital + newInterest + feeTotal;

        updateData.monthlyCapital = new Prisma.Decimal(newCapital);
        updateData.monthlyInterest = new Prisma.Decimal(newInterest);
        updateData.originalMonthlyCapital = new Prisma.Decimal(newCapital);
        updateData.originalMonthlyInterest = new Prisma.Decimal(newInterest);
        updateData.minimumPayment = new Prisma.Decimal(newMinPayment);
        updateData.originalMinimumPayment = new Prisma.Decimal(newMinPayment);
      } else if (fees !== undefined) {
        // Fees changed but breakdown didn't — recompute totals
        const capital = Number(currentDebt.originalMonthlyCapital);
        const interest = Number(currentDebt.originalMonthlyInterest);
        const feeTotal = totalMonthlyFees(fees?.length ? fees : []);
        const newMinPayment = capital + interest + feeTotal;
        updateData.minimumPayment = new Prisma.Decimal(
          Number(currentDebt.monthlyCapital) +
            Number(currentDebt.monthlyInterest) +
            feeTotal,
        );
        updateData.originalMinimumPayment = new Prisma.Decimal(newMinPayment);
      }

      const needsRecompute =
        data.balance !== undefined ||
        data.interestRate !== undefined ||
        breakdownChanged ||
        data.startedAt !== undefined ||
        fees !== undefined;

      if (needsRecompute) {
        const feeTotal = totalMonthlyFees(
          fees !== undefined
            ? (fees?.length ? fees : [])
            : parseFees(currentDebt.fees),
        );
        const origCapital =
          data.monthlyCapital ?? Number(currentDebt.originalMonthlyCapital);
        const origInterest =
          data.monthlyInterest ?? Number(currentDebt.originalMonthlyInterest);
        const origMinPayment = origCapital + origInterest + feeTotal;

        const debtForCalc = {
          originalBalance:
            data.balance !== undefined
              ? new Prisma.Decimal(data.balance)
              : currentDebt.originalBalance,
          interestRate:
            data.interestRate !== undefined
              ? new Prisma.Decimal(data.interestRate)
              : currentDebt.interestRate,
          originalMinimumPayment: new Prisma.Decimal(origMinPayment),
          startedAt:
            data.startedAt !== undefined
              ? data.startedAt
              : currentDebt.startedAt,
          fees:
            fees !== undefined
              ? (fees?.length ? fees : null)
              : currentDebt.fees,
        };
        const newBalance = recomputeBalance(debtForCalc, currentDebt.payments);
        updateData.balance = new Prisma.Decimal(newBalance);
      }

      try {
        const debt = await ctx.db.debt.update({
          where: { id },
          data: updateData,
          include: includePayments,
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
        await ctx.db.debt.delete({ where: { id: input.id } });
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

  addPayment: publicProcedure
    .input(addPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const debt = await ctx.db.debt.findUnique({
        where: { id: input.debtId },
        include: includePayments,
      });
      if (!debt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Debt with ID ${input.debtId} not found`,
        });
      }
      if (input.amount > Number(debt.balance)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment amount cannot exceed the current balance",
        });
      }

      const hasBreakdown =
        input.newMonthlyCapital != null && input.newMonthlyInterest != null;
      const paymentFeeTotal = input.newFees?.length
        ? totalMonthlyFees(input.newFees)
        : totalMonthlyFees(parseFees(debt.fees));
      const newMinPayment = hasBreakdown
        ? input.newMonthlyCapital! + input.newMonthlyInterest! + paymentFeeTotal
        : null;

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.debtPayment.create({
          data: {
            amount: new Prisma.Decimal(input.amount),
            date: input.date,
            notes: input.notes ?? null,
            newMonthlyCapital: hasBreakdown
              ? new Prisma.Decimal(input.newMonthlyCapital!)
              : null,
            newMonthlyInterest: hasBreakdown
              ? new Prisma.Decimal(input.newMonthlyInterest!)
              : null,
            newMinimumPayment: newMinPayment
              ? new Prisma.Decimal(newMinPayment)
              : null,
            newFees: input.newFees?.length ? input.newFees : Prisma.JsonNull,
            debtId: input.debtId,
          },
        });

        const allPayments = await tx.debtPayment.findMany({
          where: { debtId: input.debtId },
        });
        const newBalance = recomputeBalance(debt, allPayments);

        const debtUpdate: Prisma.DebtUpdateInput = {
          balance: new Prisma.Decimal(newBalance),
          status: newBalance <= 0 ? "PAID_OFF" : debt.status,
        };

        if (hasBreakdown) {
          debtUpdate.monthlyCapital = new Prisma.Decimal(
            input.newMonthlyCapital!,
          );
          debtUpdate.monthlyInterest = new Prisma.Decimal(
            input.newMonthlyInterest!,
          );
          debtUpdate.minimumPayment = new Prisma.Decimal(newMinPayment!);
        }

        return tx.debt.update({
          where: { id: input.debtId },
          data: debtUpdate,
          include: includePayments,
        });
      });

      // Auto-create expense if debt has a funding link
      const fundingLink = await ctx.db.fundingLink.findFirst({
        where: { debtId: input.debtId },
      });
      if (fundingLink) {
        await recordDebtFreePaymentExpense(
          ctx.db,
          debt.name,
          input.amount,
          input.date,
          fundingLink.sourceAccountId,
        );
      }

      return serializeDebt(updated);
    }),

  deletePayment: publicProcedure
    .input(deletePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.debtPayment.findUnique({
        where: { id: input.id },
        include: { debt: true },
      });
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Payment with ID ${input.id} not found`,
        });
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.debtPayment.delete({ where: { id: input.id } });

        const remainingPayments = await tx.debtPayment.findMany({
          where: { debtId: payment.debtId },
          orderBy: { date: "asc" },
        });

        const debt = payment.debt;
        const newBalance = recomputeBalance(debt, remainingPayments);
        const { capital, interest, fees: currentFees } = deriveCurrentBreakdown(
          Number(debt.originalMonthlyCapital),
          Number(debt.originalMonthlyInterest),
          parseFees(debt.fees),
          remainingPayments,
        );
        const currentFeeTotal = totalMonthlyFees(currentFees);
        const currentMinPayment = capital + interest + currentFeeTotal;

        return tx.debt.update({
          where: { id: payment.debtId },
          data: {
            balance: new Prisma.Decimal(newBalance),
            monthlyCapital: new Prisma.Decimal(capital),
            monthlyInterest: new Prisma.Decimal(interest),
            minimumPayment: new Prisma.Decimal(currentMinPayment),
            status: newBalance <= 0 ? "PAID_OFF" : "ACTIVE",
          },
          include: includePayments,
        });
      });

      return serializeDebt(updated);
    }),

  markInstallmentPaid: publicProcedure
    .input(markInstallmentPaidSchema)
    .mutation(async ({ ctx, input }) => {
      const installment = await ctx.db.debtInstallment.findUnique({
        where: { id: input.id },
        include: { debt: true },
      });
      if (!installment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Installment with ID ${input.id} not found`,
        });
      }
      if (installment.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Installment is already marked as paid",
        });
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.debtInstallment.update({
          where: { id: input.id },
          data: {
            status: "PAID",
            paidAt: input.paidAt ?? new Date(),
          },
        });

        const allInstallments = await tx.debtInstallment.findMany({
          where: { debtId: installment.debtId },
        });
        const newBalance = computeScheduleBalance(allInstallments);
        const allPaid = allInstallments.every(
          (i) => i.id === input.id || i.status === "PAID",
        );

        return tx.debt.update({
          where: { id: installment.debtId },
          data: {
            balance: new Prisma.Decimal(newBalance),
            status: allPaid ? "PAID_OFF" : undefined,
          },
          include: {
            ...includePayments,
            installments: { orderBy: { installmentNumber: "asc" } },
          },
        });
      });

      // Auto-create expense if debt has a funding link
      const fundingLink = await ctx.db.fundingLink.findFirst({
        where: { debtId: installment.debtId },
      });
      if (fundingLink) {
        await recordDebtPaymentExpense(
          ctx.db,
          installment.debt.name,
          installment.installmentNumber,
          Number(installment.totalAmount),
          input.paidAt ?? new Date(),
          fundingLink.sourceAccountId,
        );

        // Update recurring transaction amount to match next pending installment
        const nextPending = await ctx.db.debtInstallment.findFirst({
          where: { debtId: installment.debtId, status: "PENDING" },
          orderBy: { dueDate: "asc" },
        });
        if (nextPending) {
          await ctx.db.recurringTransaction.updateMany({
            where: { debtId: installment.debtId },
            data: { amount: nextPending.totalAmount },
          });
        }
      }

      return serializeDebt(updated);
    }),

  markInstallmentUnpaid: publicProcedure
    .input(markInstallmentUnpaidSchema)
    .mutation(async ({ ctx, input }) => {
      const installment = await ctx.db.debtInstallment.findUnique({
        where: { id: input.id },
        include: { debt: true },
      });
      if (!installment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Installment with ID ${input.id} not found`,
        });
      }
      if (installment.status === "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Installment is already pending",
        });
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.debtInstallment.update({
          where: { id: input.id },
          data: {
            status: "PENDING",
            paidAt: null,
          },
        });

        const allInstallments = await tx.debtInstallment.findMany({
          where: { debtId: installment.debtId },
        });
        const newBalance = computeScheduleBalance(allInstallments);

        return tx.debt.update({
          where: { id: installment.debtId },
          data: {
            balance: new Prisma.Decimal(newBalance),
            status: "ACTIVE",
          },
          include: {
            ...includePayments,
            installments: { orderBy: { installmentNumber: "asc" } },
          },
        });
      });

      return serializeDebt(updated);
    }),

  addScheduleCapitalPayment: publicProcedure
    .input(addScheduleCapitalPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const debt = await ctx.db.debt.findUnique({
        where: { id: input.debtId },
        include: {
          ...includePayments,
          installments: { orderBy: { installmentNumber: "asc" } },
        },
      });

      if (!debt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Debt with ID ${input.debtId} not found`,
        });
      }
      if (!debt.hasSchedule) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This debt does not have a schedule",
        });
      }
      if (debt.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add capital payment to a paid-off debt",
        });
      }

      const paidInstallments = debt.installments.filter((i) => i.status === "PAID");
      const pendingInstallments = debt.installments.filter((i) => i.status === "PENDING");
      const lastPaidNumber =
        paidInstallments.length > 0
          ? Math.max(...paidInstallments.map((i) => i.installmentNumber))
          : 0;

      const remainingCapital = computeScheduleBalance(debt.installments);

      if (input.amount > remainingCapital) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment amount cannot exceed the remaining balance",
        });
      }

      const newBalance = Math.round((remainingCapital - input.amount) * 100) / 100;

      const updated = await ctx.db.$transaction(async (tx) => {
        // 1. Create payment record
        await tx.debtPayment.create({
          data: {
            amount: new Prisma.Decimal(input.amount),
            date: input.date,
            notes: input.notes ?? null,
            debtId: input.debtId,
          },
        });

        // 2. Delete all PENDING installments
        await tx.debtInstallment.deleteMany({
          where: { debtId: input.debtId, status: "PENDING" },
        });

        // 3. Generate replacement installments (if balance remains)
        if (newBalance > 0) {
          let newInstallments: Array<{
            installmentNumber: number;
            dueDate: Date;
            capital: number;
            interest: number;
            fees?: Array<{ name: string; amount: number }>;
            notes?: string | null;
          }>;

          if (input.mode === "auto") {
            const firstPending = pendingInstallments[0];
            const dueDate = firstPending
              ? new Date(firstPending.dueDate)
              : new Date();
            const dueDay = dueDate.getDate();
            const fees = parseFees(debt.fees);

            const remainingMonths =
              input.termOption === "reduce_payment"
                ? pendingInstallments.length
                : input.newTermMonths!;

            // generateEqualPaymentSchedule adds 1 month to startDate for installment #1,
            // so offset by -1 month to land on the correct first due date
            const startDate = new Date(
              dueDate.getFullYear(),
              dueDate.getMonth() - 1,
              dueDay,
            );

            const schedule = generateEqualPaymentSchedule({
              balance: newBalance,
              interestRate: Number(debt.interestRate),
              termMonths: remainingMonths,
              startDate,
              dueDay,
              fees: fees.length > 0 ? fees : undefined,
            });

            newInstallments = schedule.map((inst, idx) => ({
              ...inst,
              installmentNumber: lastPaidNumber + 1 + idx,
            }));
          } else {
            // Custom mode: use provided installments, renumber
            newInstallments = input.customInstallments!.map((inst, idx) => ({
              ...inst,
              installmentNumber: lastPaidNumber + 1 + idx,
            }));
          }

          // 4. Create new installments
          await tx.debtInstallment.createMany({
            data: newInstallments.map((inst) => {
              const instFeeTotal = totalMonthlyFees(inst.fees);
              return {
                installmentNumber: inst.installmentNumber,
                dueDate: inst.dueDate,
                capital: new Prisma.Decimal(inst.capital),
                interest: new Prisma.Decimal(inst.interest),
                fees: inst.fees?.length ? inst.fees : Prisma.JsonNull,
                totalAmount: new Prisma.Decimal(
                  Math.round((inst.capital + inst.interest + instFeeTotal) * 100) / 100,
                ),
                notes: inst.notes ?? null,
                debtId: input.debtId,
              };
            }),
          });

          // 5. Update debt summary fields from first new installment
          const firstNew = newInstallments[0];
          const firstNewFeeTotal = totalMonthlyFees(firstNew.fees);
          const newMinPayment = firstNew.capital + firstNew.interest + firstNewFeeTotal;

          return tx.debt.update({
            where: { id: input.debtId },
            data: {
              balance: new Prisma.Decimal(newBalance),
              monthlyCapital: new Prisma.Decimal(firstNew.capital),
              monthlyInterest: new Prisma.Decimal(firstNew.interest),
              minimumPayment: new Prisma.Decimal(newMinPayment),
              termMonths: paidInstallments.length + newInstallments.length,
            },
            include: {
              ...includePayments,
              installments: { orderBy: { installmentNumber: "asc" } },
            },
          });
        } else {
          // Balance is 0 — debt is paid off
          return tx.debt.update({
            where: { id: input.debtId },
            data: {
              balance: new Prisma.Decimal(0),
              status: "PAID_OFF",
              termMonths: paidInstallments.length,
            },
            include: {
              ...includePayments,
              installments: { orderBy: { installmentNumber: "asc" } },
            },
          });
        }
      });

      return serializeDebt(updated);
    }),
});
