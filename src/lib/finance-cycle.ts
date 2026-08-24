import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  getDaysInMonth,
  isAfter,
  isBefore,
  isEqual,
  setDate,
  startOfDay,
  startOfMonth,
} from "date-fns";

export const FINANCE_CURRENCIES = ["PEN", "USD", "EUR"] as const;
export type FinanceCurrency = (typeof FINANCE_CURRENCIES)[number];

export const FINANCE_CYCLE_OPENING_ACCOUNT_TYPES = [
  "BANK",
  "CASH",
  "SAVINGS",
] as const;

export const FINANCE_CYCLE_KINDS = [
  "WEEK",
  "THREE_MONTHS",
  "SIX_MONTHS",
  "CUSTOM",
] as const;
export type FinanceCycleKind = (typeof FINANCE_CYCLE_KINDS)[number];

export const FINANCE_SCENARIOS = [
  "conservative",
  "expected",
  "optimistic",
] as const;
export type FinanceScenario = (typeof FINANCE_SCENARIOS)[number];

export type FinanceGoalPriority = "HIGH" | "MEDIUM" | "LOW";
export type FinanceGoalStatus = "ACTIVE" | "FUNDED" | "DEFERRED";

export type FinanceCycleGoalInput = {
  id?: string;
  name: string;
  amount: number;
  currency: FinanceCurrency;
  priority: FinanceGoalPriority;
  status?: FinanceGoalStatus;
  position?: number;
};

export type FinanceStatementPaymentInput = {
  id: string;
  label: string;
  dueDate: Date;
  amounts: Array<{
    amount: number;
    currency: FinanceCurrency;
  }>;
};

export type FinanceCycleForecastInput = {
  kind: FinanceCycleKind;
  startDate: Date;
  endDate: Date;
  displayCurrency: FinanceCurrency;
  openingAmount: number;
  openingCurrency: FinanceCurrency;
  monthlyIncome: number;
  incomeCurrency: FinanceCurrency;
  incomeDayOfMonth?: number;
  monthlyHousehold: number;
  householdCurrency: FinanceCurrency;
  householdDayOfMonth?: number;
  monthlyFlexible: number;
  flexibleCurrency: FinanceCurrency;
  flexibleDayOfMonth?: number;
  monthlyDebt: number;
  debtCurrency: FinanceCurrency;
  debtDayOfMonth?: number;
  emergencyFloor: number;
  emergencyCurrency: FinanceCurrency;
  incomeVariance: number;
  penPerUsd: number;
  usdPerEur: number;
  goals: FinanceCycleGoalInput[];
  statementPayments?: FinanceStatementPaymentInput[];
};

export type FinanceStatementPaymentEvent = {
  id: string;
  label: string;
  amount: number;
};

export type FinanceProjectionPoint = {
  date: Date;
  balance: number;
  goalPurchases: number;
  cashAfterGoals: number;
  openingBalance: number;
  income: number;
  householdSpending: number;
  flexibleSpending: number;
  debtPayments: number;
  statementPayments: number;
  statementPaymentAmount: number;
  statementPaymentEvents: FinanceStatementPaymentEvent[];
  totalExpenses: number;
  netChange: number;
};

export type FinanceScenarioResult = {
  scenario: FinanceScenario;
  monthlyIncome: number;
  monthlyNet: number;
  periodRoom: number;
  finalBalance: number;
  availableForGoals: number;
  goalTotal: number;
  goalSpend: number;
  goalGap: number;
  fundedPercent: number;
  requiredPerPeriod: number;
  extraPerPeriod: number;
  points: FinanceProjectionPoint[];
  affordableGoalIds: string[];
  deferredGoalIds: string[];
};

export type FinanceForecast = {
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  displayCurrency: FinanceCurrency;
  openingBalance: number;
  emergencyFloor: number;
  statementPaymentTotal: number;
  goalTotal: number;
  results: Record<FinanceScenario, FinanceScenarioResult>;
};

const AVERAGE_DAYS_PER_MONTH = 365.2425 / 12;
const PRIORITY_ORDER: Record<FinanceGoalPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function safePositive(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function deriveFinanceCycleEndDate(
  startDate: Date,
  kind: FinanceCycleKind,
  customEndDate?: Date,
) {
  if (kind === "WEEK") return addDays(startDate, 7);
  if (kind === "THREE_MONTHS") return addMonths(startDate, 3);
  if (kind === "SIX_MONTHS") return addMonths(startDate, 6);
  if (customEndDate && isAfter(customEndDate, startDate)) return customEndDate;
  return addMonths(startDate, 3);
}

export function convertFinanceCurrency(
  amount: number,
  from: FinanceCurrency,
  to: FinanceCurrency,
  rates: { penPerUsd: number; usdPerEur: number },
) {
  if (from === to) return amount;

  const penPerUsd = safePositive(rates.penPerUsd, 3.72);
  const usdPerEur = safePositive(rates.usdPerEur, 1.15);
  const usdAmount =
    from === "USD" ? amount : from === "PEN" ? amount / penPerUsd : amount * usdPerEur;

  if (to === "USD") return usdAmount;
  if (to === "PEN") return usdAmount * penPerUsd;
  return usdAmount / usdPerEur;
}

function durationInMonths(input: FinanceCycleForecastInput) {
  if (input.kind === "WEEK") return 12 / 52;
  if (input.kind === "THREE_MONTHS") return 3;
  if (input.kind === "SIX_MONTHS") return 6;

  if (!isAfter(input.endDate, input.startDate)) {
    return 1 / AVERAGE_DAYS_PER_MONTH;
  }

  let wholeMonths = 0;
  let anchor = input.startDate;
  let nextAnchor = addMonths(input.startDate, 1);
  while (!isAfter(nextAnchor, input.endDate)) {
    wholeMonths += 1;
    anchor = nextAnchor;
    nextAnchor = addMonths(input.startDate, wholeMonths + 1);
  }
  if (isEqual(anchor, input.endDate)) return wholeMonths;

  const daysInPartialMonth = Math.max(
    1,
    differenceInCalendarDays(nextAnchor, anchor),
  );
  const partialDays = Math.max(
    0,
    differenceInCalendarDays(input.endDate, anchor),
  );
  return wholeMonths + partialDays / daysInPartialMonth;
}

type ScheduledCashFlow = {
  income: number;
  household: number;
  flexible: number;
  debt: number;
  statementPayments: FinanceStatementPaymentEvent[];
};

function dayOfMonth(value: number | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(31, Math.max(1, Math.trunc(value ?? 1)));
}

function dateKey(value: Date) {
  return startOfDay(value).getTime();
}

function scheduledDateInMonth(month: Date, scheduledDay: number) {
  const monthStart = startOfMonth(month);
  return setDate(monthStart, Math.min(scheduledDay, getDaysInMonth(monthStart)));
}

function scheduledCashFlows(input: FinanceCycleForecastInput) {
  const flows = new Map<number, ScheduledCashFlow>();
  const startDate = startOfDay(input.startDate);
  const endDate = startOfDay(input.endDate);
  const schedules = [
    { key: "income" as const, day: dayOfMonth(input.incomeDayOfMonth) },
    {
      key: "household" as const,
      day: dayOfMonth(input.householdDayOfMonth),
    },
    {
      key: "flexible" as const,
      day: dayOfMonth(input.flexibleDayOfMonth),
    },
    { key: "debt" as const, day: dayOfMonth(input.debtDayOfMonth) },
  ];

  let month = startOfMonth(startDate);
  const finalMonth = startOfMonth(endDate);
  while (!isAfter(month, finalMonth)) {
    for (const schedule of schedules) {
      const scheduledDate = scheduledDateInMonth(month, schedule.day);
      if (isBefore(scheduledDate, startDate) || isAfter(scheduledDate, endDate)) {
        continue;
      }

      const key = dateKey(scheduledDate);
      const flow = flows.get(key) ?? {
        income: 0,
        household: 0,
        flexible: 0,
        debt: 0,
        statementPayments: [],
      };
      flow[schedule.key] += 1;
      flows.set(key, flow);
    }
    month = addMonths(month, 1);
  }

  for (const statement of input.statementPayments ?? []) {
    const dueDate = startOfDay(statement.dueDate);
    if (isBefore(dueDate, startDate) || isAfter(dueDate, endDate)) continue;

    const amount = statement.amounts.reduce(
      (sum, item) =>
        sum +
        convertFinanceCurrency(
          Math.max(0, item.amount),
          item.currency,
          input.displayCurrency,
          { penPerUsd: input.penPerUsd, usdPerEur: input.usdPerEur },
        ),
      0,
    );
    if (amount <= 0) continue;

    const key = dateKey(dueDate);
    const flow = flows.get(key) ?? {
      income: 0,
      household: 0,
      flexible: 0,
      debt: 0,
      statementPayments: [],
    };
    flow.statementPayments.push({
      id: statement.id,
      label: statement.label,
      amount,
    });
    flows.set(key, flow);
  }

  return flows;
}

function projectionDates(
  input: FinanceCycleForecastInput,
  flows: Map<number, ScheduledCashFlow>,
) {
  const dateByKey = new Map<number, Date>();
  dateByKey.set(dateKey(input.startDate), input.startDate);
  dateByKey.set(dateKey(input.endDate), input.endDate);
  for (const key of flows.keys()) {
    if (!dateByKey.has(key)) dateByKey.set(key, new Date(key));
  }

  return [...dateByKey.values()].sort(
    (left, right) => dateKey(left) - dateKey(right),
  );
}

function allocateGoals(
  goals: FinanceCycleGoalInput[],
  available: number,
  displayCurrency: FinanceCurrency,
  rates: { penPerUsd: number; usdPerEur: number },
) {
  const activeGoals = goals
    .filter((goal) => (goal.status ?? "ACTIVE") === "ACTIVE")
    .map((goal, index) => ({ ...goal, originalIndex: index }))
    .sort(
      (left, right) =>
        PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority] ||
        (left.position ?? left.originalIndex) -
          (right.position ?? right.originalIndex),
    );

  let remaining = Math.max(0, available);
  let blockedByPriority = false;
  let goalSpend = 0;
  const affordableGoalIds: string[] = [];
  const deferredGoalIds: string[] = [];

  for (const goal of activeGoals) {
    const convertedAmount = convertFinanceCurrency(
      goal.amount,
      goal.currency,
      displayCurrency,
      rates,
    );
    const id = goal.id ?? `goal-${goal.originalIndex}`;
    if (!blockedByPriority && convertedAmount <= remaining) {
      affordableGoalIds.push(id);
      remaining -= convertedAmount;
      goalSpend += convertedAmount;
    } else {
      blockedByPriority = true;
      deferredGoalIds.push(id);
    }
  }

  return { affordableGoalIds, deferredGoalIds, goalSpend };
}

export function calculateFinanceForecast(
  input: FinanceCycleForecastInput,
): FinanceForecast {
  const rates = {
    penPerUsd: safePositive(input.penPerUsd, 3.72),
    usdPerEur: safePositive(input.usdPerEur, 1.15),
  };
  const durationMonths = durationInMonths(input);
  const periods = input.kind === "WEEK" ? 1 : durationMonths;
  const openingBalance = convertFinanceCurrency(
    Math.max(0, input.openingAmount),
    input.openingCurrency,
    input.displayCurrency,
    rates,
  );
  const emergencyFloor = convertFinanceCurrency(
    Math.max(0, input.emergencyFloor),
    input.emergencyCurrency,
    input.displayCurrency,
    rates,
  );
  const baseMonthlyIncome = convertFinanceCurrency(
    Math.max(0, input.monthlyIncome),
    input.incomeCurrency,
    input.displayCurrency,
    rates,
  );
  const monthlyHousehold = convertFinanceCurrency(
    Math.max(0, input.monthlyHousehold),
    input.householdCurrency,
    input.displayCurrency,
    rates,
  );
  const monthlyFlexible = convertFinanceCurrency(
    Math.max(0, input.monthlyFlexible),
    input.flexibleCurrency,
    input.displayCurrency,
    rates,
  );
  const monthlyDebt = convertFinanceCurrency(
    Math.max(0, input.monthlyDebt),
    input.debtCurrency,
    input.displayCurrency,
    rates,
  );
  const goalTotal = input.goals
    .filter((goal) => (goal.status ?? "ACTIVE") === "ACTIVE")
    .reduce(
      (sum, goal) =>
        sum +
        convertFinanceCurrency(
          Math.max(0, goal.amount),
          goal.currency,
          input.displayCurrency,
          rates,
        ),
      0,
    );
  const variance = Math.min(100, Math.max(0, input.incomeVariance)) / 100;
  const factors: Record<FinanceScenario, number> = {
    conservative: 1 - variance,
    expected: 1,
    optimistic: 1 + variance,
  };
  const cashFlows = scheduledCashFlows(input);
  const dates = projectionDates(input, cashFlows);
  const statementPaymentTotal = [...cashFlows.values()].reduce(
    (sum, flow) =>
      sum +
      flow.statementPayments.reduce(
        (flowSum, item) => flowSum + item.amount,
        0,
      ),
    0,
  );

  const results = Object.fromEntries(
    FINANCE_SCENARIOS.map((scenario) => {
      const monthlyIncome = baseMonthlyIncome * factors[scenario];
      const monthlyNet =
        monthlyIncome - monthlyHousehold - monthlyFlexible - monthlyDebt;
      let income = 0;
      let householdSpending = 0;
      let flexibleSpending = 0;
      let debtPayments = 0;
      let statementPayments = 0;
      const points = dates.map((date) => {
        const cashFlow = cashFlows.get(dateKey(date));
        income += monthlyIncome * (cashFlow?.income ?? 0);
        householdSpending += monthlyHousehold * (cashFlow?.household ?? 0);
        flexibleSpending += monthlyFlexible * (cashFlow?.flexible ?? 0);
        debtPayments += monthlyDebt * (cashFlow?.debt ?? 0);
        const statementPaymentEvents = cashFlow?.statementPayments ?? [];
        const statementPaymentAmount = statementPaymentEvents.reduce(
          (sum, item) => sum + item.amount,
          0,
        );
        statementPayments += statementPaymentAmount;
        const totalExpenses =
          householdSpending +
          flexibleSpending +
          debtPayments +
          statementPayments;
        const netChange = income - totalExpenses;

        return {
          date,
          balance: openingBalance + netChange,
          goalPurchases: 0,
          cashAfterGoals: openingBalance + netChange,
          openingBalance,
          income,
          householdSpending,
          flexibleSpending,
          debtPayments,
          statementPayments,
          statementPaymentAmount,
          statementPaymentEvents,
          totalExpenses,
          netChange,
        };
      });
      const finalBalance = points.at(-1)?.balance ?? openingBalance;
      const availableForGoals = Math.max(0, finalBalance - emergencyFloor);
      const goalGap = Math.max(0, goalTotal - availableForGoals);
      const requiredPerPeriod = Math.max(
        0,
        (goalTotal + emergencyFloor - openingBalance) / periods,
      );
      const extraPerPeriod = goalGap / periods;
      const periodRoom =
        input.kind === "WEEK"
          ? monthlyNet * (12 / 52) - statementPaymentTotal
          : monthlyNet - statementPaymentTotal / periods;
      const allocation = allocateGoals(
        input.goals,
        availableForGoals,
        input.displayCurrency,
        rates,
      );
      const finalPoint = points.at(-1);
      if (finalPoint) {
        finalPoint.goalPurchases = allocation.goalSpend;
        finalPoint.cashAfterGoals = finalPoint.balance - allocation.goalSpend;
      }
      const fundedPercent =
        goalTotal > 0 ? (allocation.goalSpend / goalTotal) * 100 : 0;

      const result: FinanceScenarioResult = {
        scenario,
        monthlyIncome,
        monthlyNet,
        periodRoom,
        finalBalance,
        availableForGoals,
        goalTotal,
        goalGap,
        fundedPercent,
        requiredPerPeriod,
        extraPerPeriod,
        points,
        ...allocation,
      };
      return [scenario, result];
    }),
  ) as Record<FinanceScenario, FinanceScenarioResult>;

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    durationMonths,
    displayCurrency: input.displayCurrency,
    openingBalance,
    emergencyFloor,
    statementPaymentTotal,
    goalTotal,
    results,
  };
}
