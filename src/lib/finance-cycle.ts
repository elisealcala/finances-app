import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isEqual,
} from "date-fns";

export const FINANCE_CURRENCIES = ["PEN", "USD", "EUR"] as const;
export type FinanceCurrency = (typeof FINANCE_CURRENCIES)[number];

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

export type FinanceCycleForecastInput = {
  kind: FinanceCycleKind;
  startDate: Date;
  endDate: Date;
  displayCurrency: FinanceCurrency;
  openingAmount: number;
  openingCurrency: FinanceCurrency;
  monthlyIncome: number;
  incomeCurrency: FinanceCurrency;
  monthlyHousehold: number;
  householdCurrency: FinanceCurrency;
  monthlyFlexible: number;
  flexibleCurrency: FinanceCurrency;
  monthlyDebt: number;
  debtCurrency: FinanceCurrency;
  emergencyFloor: number;
  emergencyCurrency: FinanceCurrency;
  incomeVariance: number;
  penPerUsd: number;
  usdPerEur: number;
  goals: FinanceCycleGoalInput[];
};

export type FinanceProjectionPoint = {
  date: Date;
  balance: number;
};

export type FinanceScenarioResult = {
  scenario: FinanceScenario;
  monthlyIncome: number;
  monthlyNet: number;
  periodRoom: number;
  finalBalance: number;
  availableForGoals: number;
  goalTotal: number;
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
  return Math.max(
    differenceInCalendarDays(input.endDate, input.startDate) /
      AVERAGE_DAYS_PER_MONTH,
    1 / AVERAGE_DAYS_PER_MONTH,
  );
}

function projectionDates(input: FinanceCycleForecastInput) {
  if (input.kind === "WEEK") return [input.startDate, input.endDate];

  const dates = [input.startDate];
  let cursor = addMonths(input.startDate, 1);
  while (isBefore(cursor, input.endDate)) {
    dates.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  if (!isEqual(dates.at(-1) ?? input.startDate, input.endDate)) {
    dates.push(input.endDate);
  }
  return dates;
}

function monthsElapsed(
  startDate: Date,
  pointDate: Date,
  endDate: Date,
  totalMonths: number,
) {
  if (isEqual(pointDate, endDate)) return totalMonths;
  return Math.max(
    0,
    differenceInCalendarDays(pointDate, startDate) / AVERAGE_DAYS_PER_MONTH,
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
    } else {
      blockedByPriority = true;
      deferredGoalIds.push(id);
    }
  }

  return { affordableGoalIds, deferredGoalIds };
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
  const dates = projectionDates(input);

  const results = Object.fromEntries(
    FINANCE_SCENARIOS.map((scenario) => {
      const monthlyIncome = baseMonthlyIncome * factors[scenario];
      const monthlyNet =
        monthlyIncome - monthlyHousehold - monthlyFlexible - monthlyDebt;
      const finalBalance = openingBalance + monthlyNet * durationMonths;
      const availableForGoals = Math.max(0, finalBalance - emergencyFloor);
      const goalGap = Math.max(0, goalTotal - availableForGoals);
      const fundedPercent =
        goalTotal > 0
          ? Math.min(100, (Math.min(goalTotal, availableForGoals) / goalTotal) * 100)
          : 0;
      const requiredPerPeriod = Math.max(
        0,
        (goalTotal + emergencyFloor - openingBalance) / periods,
      );
      const extraPerPeriod = goalGap / periods;
      const periodRoom =
        input.kind === "WEEK" ? monthlyNet * (12 / 52) : monthlyNet;
      const points = dates.map((date) => ({
        date,
        balance:
          openingBalance +
          monthlyNet *
            monthsElapsed(input.startDate, date, input.endDate, durationMonths),
      }));
      const allocation = allocateGoals(
        input.goals,
        availableForGoals,
        input.displayCurrency,
        rates,
      );

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
    goalTotal,
    results,
  };
}
