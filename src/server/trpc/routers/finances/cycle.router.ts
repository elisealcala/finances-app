import { subDays } from "date-fns";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";
import type {
  FinanceCycle,
  FinanceCycleGoal,
} from "@/generated/prisma/client";
import {
  calculateFinanceForecast,
  deriveFinanceCycleEndDate,
  FINANCE_CYCLE_OPENING_ACCOUNT_TYPES,
  type FinanceCycleForecastInput,
  type FinanceCurrency,
} from "@/lib/finance-cycle";
import { computeAccountBalancesByCurrency } from "@/lib/balance";
import { router, publicProcedure } from "@/server/trpc/init";
import {
  closeFinanceCycleSchema,
  createFinanceCycleSchema,
  listFinanceCyclesSchema,
  updateFinanceCycleSchema,
  type CreateFinanceCycleInput,
} from "@/server/trpc/schemas/finances.schema";

type CycleWithRelations = FinanceCycle & {
  goals: FinanceCycleGoal[];
  previousCycle: Pick<
    FinanceCycle,
    | "id"
    | "title"
    | "kind"
    | "status"
    | "startDate"
    | "endDate"
    | "closingAmount"
    | "closingCurrency"
  > | null;
};

function serializeGoal(goal: FinanceCycleGoal) {
  return { ...goal, amount: Number(goal.amount) };
}

function serializeCycle(cycle: CycleWithRelations) {
  return {
    ...cycle,
    openingAmount: Number(cycle.openingAmount),
    monthlyIncome: Number(cycle.monthlyIncome),
    monthlyHousehold: Number(cycle.monthlyHousehold),
    monthlyFlexible: Number(cycle.monthlyFlexible),
    monthlyDebt: Number(cycle.monthlyDebt),
    emergencyFloor: Number(cycle.emergencyFloor),
    incomeVariance: Number(cycle.incomeVariance),
    penPerUsd: Number(cycle.penPerUsd),
    usdPerEur: Number(cycle.usdPerEur),
    closingAmount:
      cycle.closingAmount == null ? null : Number(cycle.closingAmount),
    previousCycle: cycle.previousCycle
      ? {
          ...cycle.previousCycle,
          closingAmount:
            cycle.previousCycle.closingAmount == null
              ? null
              : Number(cycle.previousCycle.closingAmount),
        }
      : null,
    goals: cycle.goals.map(serializeGoal),
  };
}

function toForecastInput(cycle: CycleWithRelations): FinanceCycleForecastInput {
  return {
    kind: cycle.kind,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    displayCurrency: cycle.displayCurrency,
    openingAmount: Number(cycle.openingAmount),
    openingCurrency: cycle.openingCurrency,
    monthlyIncome: Number(cycle.monthlyIncome),
    incomeCurrency: cycle.incomeCurrency,
    incomeDayOfMonth: cycle.incomeDayOfMonth,
    monthlyHousehold: Number(cycle.monthlyHousehold),
    householdCurrency: cycle.householdCurrency,
    householdDayOfMonth: cycle.householdDayOfMonth,
    monthlyFlexible: Number(cycle.monthlyFlexible),
    flexibleCurrency: cycle.flexibleCurrency,
    flexibleDayOfMonth: cycle.flexibleDayOfMonth,
    monthlyDebt: Number(cycle.monthlyDebt),
    debtCurrency: cycle.debtCurrency,
    debtDayOfMonth: cycle.debtDayOfMonth,
    emergencyFloor: Number(cycle.emergencyFloor),
    emergencyCurrency: cycle.emergencyCurrency,
    incomeVariance: Number(cycle.incomeVariance),
    penPerUsd: Number(cycle.penPerUsd),
    usdPerEur: Number(cycle.usdPerEur),
    goals: cycle.goals.map(serializeGoal),
  };
}

function goalCreateData(goals: CreateFinanceCycleInput["goals"]) {
  return goals.map((goal, index) => ({
    name: goal.name,
    amount: new Prisma.Decimal(goal.amount),
    currency: goal.currency,
    priority: goal.priority,
    status: goal.status,
    position: goal.position ?? index,
  }));
}

async function resolvePreviousCycle(
  db: Parameters<typeof computeAccountBalancesByCurrency>[0],
  input: CreateFinanceCycleInput,
) {
  if (!input.carryPrevious || !input.previousCycleId) {
    return {
      openingAmount: input.openingAmount,
      openingCurrency: input.openingCurrency,
      goals: input.goals,
    };
  }

  const previous = await db.financeCycle.findUnique({
    where: { id: input.previousCycleId },
    include: { goals: true, previousCycle: true },
  });
  if (!previous) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The previous finance cycle no longer exists",
    });
  }

  const serializedPrevious = previous as CycleWithRelations;
  const previousForecast = calculateFinanceForecast(
    toForecastInput(serializedPrevious),
  );
  const openingAmount =
    previous.closingAmount == null
      ? previousForecast.results.expected.finalBalance -
        previousForecast.results.expected.goalSpend
      : Number(previous.closingAmount);
  const openingCurrency =
    previous.closingCurrency ?? previous.displayCurrency;
  const existingGoalKeys = new Set(
    input.goals.map(
      (goal) => `${goal.name.toLowerCase()}|${goal.currency}|${goal.amount}`,
    ),
  );
  const carriedGoals = previous.goals
    .filter((goal) => goal.status !== "FUNDED")
    .filter(
      (goal) =>
        !existingGoalKeys.has(
          `${goal.name.toLowerCase()}|${goal.currency}|${Number(goal.amount)}`,
        ),
    )
    .map((goal, index) => ({
      name: goal.name,
      amount: Number(goal.amount),
      currency: goal.currency,
      priority: goal.priority,
      status: "ACTIVE" as const,
      position: input.goals.length + index,
    }));

  return {
    openingAmount,
    openingCurrency,
    goals: [...input.goals, ...carriedGoals],
  };
}

const cycleInclude = {
  goals: { orderBy: { position: "asc" as const } },
  previousCycle: {
    select: {
      id: true,
      title: true,
      kind: true,
      status: true,
      startDate: true,
      endDate: true,
      closingAmount: true,
      closingCurrency: true,
    },
  },
};

export const cycleRouter = router({
  list: publicProcedure
    .input(listFinanceCyclesSchema)
    .query(async ({ ctx, input }) => {
      const cycles = await ctx.db.financeCycle.findMany({
        where: input?.status ? { status: input.status } : undefined,
        include: cycleInclude,
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      });
      return { cycles: cycles.map((cycle) => serializeCycle(cycle)) };
    }),

  defaults: publicProcedure.query(async ({ ctx }) => {
    const endDate = new Date();
    const startDate = subDays(endDate, 90);
    const [accounts, incomes, expenses, debts] = await Promise.all([
      ctx.db.account.findMany({
        where: {
          isArchived: false,
          type: { in: [...FINANCE_CYCLE_OPENING_ACCOUNT_TYPES] },
        },
      }),
      ctx.db.income.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { amount: true, currency: true, account: { select: { currency: true } } },
      }),
      ctx.db.expense.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          debtInstallmentId: null,
        },
        select: { amount: true, currency: true, account: { select: { currency: true } } },
      }),
      ctx.db.debt.findMany({
        where: { status: "ACTIVE" },
        select: {
          minimumPayment: true,
          account: { select: { currency: true } },
        },
      }),
    ]);

    const openingByCurrency: Record<FinanceCurrency, number> = {
      PEN: 0,
      USD: 0,
      EUR: 0,
    };
    await Promise.all(
      accounts.map(async (account) => {
        const balances = await computeAccountBalancesByCurrency(
          ctx.db,
          account.id,
          account.currency,
          Number(account.opening),
          account.type,
        );
        for (const currency of ["PEN", "USD", "EUR"] as const) {
          openingByCurrency[currency] += balances[currency] ?? 0;
        }
      }),
    );

    const monthlyIncomeByCurrency: Record<FinanceCurrency, number> = {
      PEN: 0,
      USD: 0,
      EUR: 0,
    };
    const monthlyHouseholdByCurrency: Record<FinanceCurrency, number> = {
      PEN: 0,
      USD: 0,
      EUR: 0,
    };
    const monthlyDebtByCurrency: Record<FinanceCurrency, number> = {
      PEN: 0,
      USD: 0,
      EUR: 0,
    };
    for (const income of incomes) {
      const currency = income.currency ?? income.account.currency;
      monthlyIncomeByCurrency[currency] += Number(income.amount) / 3;
    }
    for (const expense of expenses) {
      const currency = expense.currency ?? expense.account.currency;
      monthlyHouseholdByCurrency[currency] += Number(expense.amount) / 3;
    }
    for (const debt of debts) {
      const currency = debt.account?.currency ?? "PEN";
      monthlyDebtByCurrency[currency] += Number(debt.minimumPayment);
    }

    return {
      sampledFrom: startDate,
      sampledTo: endDate,
      openingByCurrency,
      monthlyIncomeByCurrency,
      monthlyHouseholdByCurrency,
      monthlyDebtByCurrency,
    };
  }),

  create: publicProcedure
    .input(createFinanceCycleSchema)
    .mutation(async ({ ctx, input }) => {
      const carried = await resolvePreviousCycle(ctx.db, input);
      const endDate = deriveFinanceCycleEndDate(
        input.startDate,
        input.kind,
        input.endDate,
      );
      const cycle = await ctx.db.financeCycle.create({
        data: {
          title: input.title,
          kind: input.kind,
          status: input.status,
          startDate: input.startDate,
          endDate,
          displayCurrency: input.displayCurrency,
          openingAmount: new Prisma.Decimal(carried.openingAmount),
          openingCurrency: carried.openingCurrency,
          monthlyIncome: new Prisma.Decimal(input.monthlyIncome),
          incomeCurrency: input.incomeCurrency,
          incomeDayOfMonth: input.incomeDayOfMonth,
          monthlyHousehold: new Prisma.Decimal(input.monthlyHousehold),
          householdCurrency: input.householdCurrency,
          householdDayOfMonth: input.householdDayOfMonth,
          monthlyFlexible: new Prisma.Decimal(input.monthlyFlexible),
          flexibleCurrency: input.flexibleCurrency,
          flexibleDayOfMonth: input.flexibleDayOfMonth,
          monthlyDebt: new Prisma.Decimal(input.monthlyDebt),
          debtCurrency: input.debtCurrency,
          debtDayOfMonth: input.debtDayOfMonth,
          emergencyFloor: new Prisma.Decimal(input.emergencyFloor),
          emergencyCurrency: input.emergencyCurrency,
          incomeVariance: new Prisma.Decimal(input.incomeVariance),
          penPerUsd: new Prisma.Decimal(input.penPerUsd),
          usdPerEur: new Prisma.Decimal(input.usdPerEur),
          carryPrevious: input.carryPrevious,
          previousCycle: input.previousCycleId
            ? { connect: { id: input.previousCycleId } }
            : undefined,
          goals: { create: goalCreateData(carried.goals) },
        },
        include: cycleInclude,
      });
      return serializeCycle(cycle);
    }),

  update: publicProcedure
    .input(updateFinanceCycleSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...cycleInput } = input;
      const endDate = deriveFinanceCycleEndDate(
        cycleInput.startDate,
        cycleInput.kind,
        cycleInput.endDate,
      );
      try {
        const cycle = await ctx.db.financeCycle.update({
          where: { id },
          data: {
            title: cycleInput.title,
            kind: cycleInput.kind,
            status: cycleInput.status,
            startDate: cycleInput.startDate,
            endDate,
            displayCurrency: cycleInput.displayCurrency,
            openingAmount: new Prisma.Decimal(cycleInput.openingAmount),
            openingCurrency: cycleInput.openingCurrency,
            monthlyIncome: new Prisma.Decimal(cycleInput.monthlyIncome),
            incomeCurrency: cycleInput.incomeCurrency,
            incomeDayOfMonth: cycleInput.incomeDayOfMonth,
            monthlyHousehold: new Prisma.Decimal(cycleInput.monthlyHousehold),
            householdCurrency: cycleInput.householdCurrency,
            householdDayOfMonth: cycleInput.householdDayOfMonth,
            monthlyFlexible: new Prisma.Decimal(cycleInput.monthlyFlexible),
            flexibleCurrency: cycleInput.flexibleCurrency,
            flexibleDayOfMonth: cycleInput.flexibleDayOfMonth,
            monthlyDebt: new Prisma.Decimal(cycleInput.monthlyDebt),
            debtCurrency: cycleInput.debtCurrency,
            debtDayOfMonth: cycleInput.debtDayOfMonth,
            emergencyFloor: new Prisma.Decimal(cycleInput.emergencyFloor),
            emergencyCurrency: cycleInput.emergencyCurrency,
            incomeVariance: new Prisma.Decimal(cycleInput.incomeVariance),
            penPerUsd: new Prisma.Decimal(cycleInput.penPerUsd),
            usdPerEur: new Prisma.Decimal(cycleInput.usdPerEur),
            carryPrevious: cycleInput.carryPrevious,
            previousCycle: cycleInput.previousCycleId
              ? { connect: { id: cycleInput.previousCycleId } }
              : { disconnect: true },
            goals: {
              deleteMany: {},
              create: goalCreateData(cycleInput.goals),
            },
          },
          include: cycleInclude,
        });
        return serializeCycle(cycle);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Finance cycle not found",
          });
        }
        throw error;
      }
    }),

  close: publicProcedure
    .input(closeFinanceCycleSchema)
    .mutation(async ({ ctx, input }) => {
      const cycle = await ctx.db.financeCycle.findUnique({
        where: { id: input.id },
        include: cycleInclude,
      });
      if (!cycle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finance cycle not found",
        });
      }
      const forecast = calculateFinanceForecast(toForecastInput(cycle));
      const updated = await ctx.db.financeCycle.update({
        where: { id: input.id },
        data: {
          status: "CLOSED",
          closingAmount: new Prisma.Decimal(
            forecast.results.expected.finalBalance -
              forecast.results.expected.goalSpend,
          ),
          closingCurrency: cycle.displayCurrency,
          closedAt: new Date(),
          goals: {
            updateMany: {
              where: {
                id: {
                  in: forecast.results.expected.affordableGoalIds,
                },
              },
              data: { status: "FUNDED" },
            },
          },
        },
        include: cycleInclude,
      });
      return serializeCycle(updated);
    }),
});
