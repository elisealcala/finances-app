import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  calculateFinanceForecast,
  convertFinanceCurrency,
  deriveFinanceCycleEndDate,
  FINANCE_CYCLE_OPENING_ACCOUNT_TYPES,
  type FinanceCycleForecastInput,
} from "./finance-cycle";

function date(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function assertClose(actual: number, expected: number, precision = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= precision,
    `Expected ${actual} to be within ${precision} of ${expected}`,
  );
}

function forecastInput(
  overrides: Partial<FinanceCycleForecastInput> = {},
): FinanceCycleForecastInput {
  return {
    kind: "THREE_MONTHS",
    startDate: date("2026-01-15"),
    endDate: date("2026-04-15"),
    displayCurrency: "USD",
    openingAmount: 1_000,
    openingCurrency: "USD",
    monthlyIncome: 2_000,
    incomeCurrency: "USD",
    monthlyHousehold: 700,
    householdCurrency: "USD",
    monthlyFlexible: 200,
    flexibleCurrency: "USD",
    monthlyDebt: 100,
    debtCurrency: "USD",
    emergencyFloor: 1_500,
    emergencyCurrency: "USD",
    incomeVariance: 20,
    penPerUsd: 4,
    usdPerEur: 1.25,
    goals: [
      {
        id: "primary-goal",
        name: "Primary goal",
        amount: 2_000,
        currency: "USD",
        priority: "HIGH",
      },
    ],
    ...overrides,
  };
}

describe("FINANCE_CYCLE_OPENING_ACCOUNT_TYPES", () => {
  test("limits opening balances to liquid and credit-card accounts", () => {
    assert.deepEqual([...FINANCE_CYCLE_OPENING_ACCOUNT_TYPES], [
      "BANK",
      "CASH",
      "SAVINGS",
      "CREDIT_CARD",
    ]);

    const openingAccountTypes = new Set<string>(
      FINANCE_CYCLE_OPENING_ACCOUNT_TYPES,
    );
    assert.equal(openingAccountTypes.has("INVESTMENT"), false);
    assert.equal(openingAccountTypes.has("OTHER"), false);
  });
});

describe("deriveFinanceCycleEndDate", () => {
  test("derives weekly, three-month, and six-month boundaries", () => {
    const startDate = date("2026-01-15");

    assert.equal(
      deriveFinanceCycleEndDate(startDate, "WEEK").toISOString(),
      date("2026-01-22").toISOString(),
    );
    assert.equal(
      deriveFinanceCycleEndDate(startDate, "THREE_MONTHS").toISOString(),
      date("2026-04-15").toISOString(),
    );
    assert.equal(
      deriveFinanceCycleEndDate(startDate, "SIX_MONTHS").toISOString(),
      date("2026-07-15").toISOString(),
    );
  });

  test("uses a future custom date and falls back to three months otherwise", () => {
    const startDate = date("2026-01-15");
    const customEndDate = date("2026-03-01");

    assert.equal(
      deriveFinanceCycleEndDate(
        startDate,
        "CUSTOM",
        customEndDate,
      ).toISOString(),
      customEndDate.toISOString(),
    );

    for (const invalidEndDate of [undefined, startDate, date("2026-01-14")]) {
      assert.equal(
        deriveFinanceCycleEndDate(
          startDate,
          "CUSTOM",
          invalidEndDate,
        ).toISOString(),
        date("2026-04-15").toISOString(),
      );
    }
  });
});

describe("convertFinanceCurrency", () => {
  test("converts between USD, PEN, and EUR through deterministic cross-rates", () => {
    const rates = { penPerUsd: 4, usdPerEur: 1.25 };

    assert.equal(convertFinanceCurrency(10, "USD", "PEN", rates), 40);
    assert.equal(convertFinanceCurrency(40, "PEN", "USD", rates), 10);
    assert.equal(convertFinanceCurrency(10, "EUR", "USD", rates), 12.5);
    assert.equal(convertFinanceCurrency(12.5, "USD", "EUR", rates), 10);
    assert.equal(convertFinanceCurrency(50, "PEN", "EUR", rates), 10);
    assert.equal(convertFinanceCurrency(10, "EUR", "PEN", rates), 50);
  });

  test("keeps same-currency amounts and replaces invalid rates with defaults", () => {
    assert.equal(
      convertFinanceCurrency(125, "USD", "USD", {
        penPerUsd: 0,
        usdPerEur: Number.NaN,
      }),
      125,
    );
    assert.equal(
      convertFinanceCurrency(3.72, "PEN", "USD", {
        penPerUsd: 0,
        usdPerEur: Number.NaN,
      }),
      1,
    );
    assert.equal(
      convertFinanceCurrency(1.15, "USD", "EUR", {
        penPerUsd: 0,
        usdPerEur: Number.NaN,
      }),
      1,
    );
  });
});

describe("calculateFinanceForecast", () => {
  test("calculates conservative, expected, and optimistic three-month outcomes", () => {
    const forecast = calculateFinanceForecast(forecastInput());

    assert.equal(forecast.durationMonths, 3);
    assert.equal(forecast.openingBalance, 1_000);
    assert.equal(forecast.emergencyFloor, 1_500);
    assert.equal(forecast.goalTotal, 2_000);

    const expectations = {
      conservative: {
        monthlyIncome: 1_600,
        monthlyNet: 600,
        finalBalance: 2_800,
        availableForGoals: 1_300,
        goalGap: 700,
        fundedPercent: 0,
        extraPerPeriod: 700 / 3,
        affordableGoalIds: [],
        deferredGoalIds: ["primary-goal"],
      },
      expected: {
        monthlyIncome: 2_000,
        monthlyNet: 1_000,
        finalBalance: 4_000,
        availableForGoals: 2_500,
        goalGap: 0,
        fundedPercent: 100,
        extraPerPeriod: 0,
        affordableGoalIds: ["primary-goal"],
        deferredGoalIds: [],
      },
      optimistic: {
        monthlyIncome: 2_400,
        monthlyNet: 1_400,
        finalBalance: 5_200,
        availableForGoals: 3_700,
        goalGap: 0,
        fundedPercent: 100,
        extraPerPeriod: 0,
        affordableGoalIds: ["primary-goal"],
        deferredGoalIds: [],
      },
    } as const;

    for (const scenario of [
      "conservative",
      "expected",
      "optimistic",
    ] as const) {
      const result = forecast.results[scenario];
      const expected = expectations[scenario];

      assert.equal(result.scenario, scenario);
      assert.equal(result.monthlyIncome, expected.monthlyIncome);
      assert.equal(result.monthlyNet, expected.monthlyNet);
      assert.equal(result.periodRoom, expected.monthlyNet);
      assert.equal(result.finalBalance, expected.finalBalance);
      assert.equal(result.availableForGoals, expected.availableForGoals);
      assert.equal(result.goalGap, expected.goalGap);
      assert.equal(result.fundedPercent, expected.fundedPercent);
      assertClose(result.requiredPerPeriod, 2_500 / 3);
      assertClose(result.extraPerPeriod, expected.extraPerPeriod);
      assert.deepEqual(result.affordableGoalIds, expected.affordableGoalIds);
      assert.deepEqual(result.deferredGoalIds, expected.deferredGoalIds);
      assert.equal(result.points.length, 5);
      assert.equal(result.points[0]?.balance, forecast.openingBalance);
      assert.equal(result.points.at(-1)?.balance, result.finalBalance);
    }
  });

  test("defaults all cash flows to the first day of the month", () => {
    const forecast = calculateFinanceForecast(forecastInput());
    const points = forecast.results.expected.points;
    const snapshots = points.map(({ date: pointDate, ...point }) => ({
      date: pointDate.toISOString().slice(0, 10),
      ...point,
    }));

    assert.deepEqual(snapshots, [
      {
        date: "2026-01-15",
        balance: 1_000,
        goalPurchases: 0,
        cashAfterGoals: 1_000,
        openingBalance: 1_000,
        income: 0,
        householdSpending: 0,
        flexibleSpending: 0,
        debtPayments: 0,
        totalExpenses: 0,
        netChange: 0,
      },
      {
        date: "2026-02-01",
        balance: 2_000,
        goalPurchases: 0,
        cashAfterGoals: 2_000,
        openingBalance: 1_000,
        income: 2_000,
        householdSpending: 700,
        flexibleSpending: 200,
        debtPayments: 100,
        totalExpenses: 1_000,
        netChange: 1_000,
      },
      {
        date: "2026-03-01",
        balance: 3_000,
        goalPurchases: 0,
        cashAfterGoals: 3_000,
        openingBalance: 1_000,
        income: 4_000,
        householdSpending: 1_400,
        flexibleSpending: 400,
        debtPayments: 200,
        totalExpenses: 2_000,
        netChange: 2_000,
      },
      {
        date: "2026-04-01",
        balance: 4_000,
        goalPurchases: 0,
        cashAfterGoals: 4_000,
        openingBalance: 1_000,
        income: 6_000,
        householdSpending: 2_100,
        flexibleSpending: 600,
        debtPayments: 300,
        totalExpenses: 3_000,
        netChange: 3_000,
      },
      {
        date: "2026-04-15",
        balance: 4_000,
        goalPurchases: 2_000,
        cashAfterGoals: 2_000,
        openingBalance: 1_000,
        income: 6_000,
        householdSpending: 2_100,
        flexibleSpending: 600,
        debtPayments: 300,
        totalExpenses: 3_000,
        netChange: 3_000,
      },
    ]);
  });

  test("does not apply a cash flow outside a weekly cycle", () => {
    const startDate = date("2026-01-15");
    const endDate = deriveFinanceCycleEndDate(startDate, "WEEK");
    const forecast = calculateFinanceForecast(
      forecastInput({ kind: "WEEK", startDate, endDate }),
    );
    const expected = forecast.results.expected;
    const weeklyFraction = 12 / 52;

    assert.equal(forecast.durationMonths, weeklyFraction);
    assert.equal(expected.points.length, 2);
    assertClose(expected.periodRoom, 1_000 * weeklyFraction);
    assert.equal(expected.finalBalance, 1_000);
    assert.equal(expected.availableForGoals, 0);
    assert.equal(expected.goalGap, 2_000);
    assert.equal(expected.fundedPercent, 0);
    assert.equal(expected.extraPerPeriod, 2_000);
    assert.equal(expected.requiredPerPeriod, 2_500);
    assert.equal(expected.points.at(-1)?.date.toISOString(), endDate.toISOString());
    assert.equal(expected.points.at(-1)?.balance, expected.finalBalance);
  });

  test("applies full cash flows on their distinct scheduled dates without proration", () => {
    const startDate = date("2026-01-15");
    const endDate = deriveFinanceCycleEndDate(startDate, "WEEK");
    const points = calculateFinanceForecast(
      forecastInput({
        kind: "WEEK",
        startDate,
        endDate,
        incomeDayOfMonth: 20,
        householdDayOfMonth: 21,
        flexibleDayOfMonth: 21,
        debtDayOfMonth: 22,
      }),
    ).results.expected.points;
    const snapshots = points.map(({ date: pointDate, ...point }) => ({
      date: pointDate.toISOString().slice(0, 10),
      ...point,
    }));

    assert.deepEqual(snapshots, [
      {
        date: "2026-01-15",
        balance: 1_000,
        goalPurchases: 0,
        cashAfterGoals: 1_000,
        openingBalance: 1_000,
        income: 0,
        householdSpending: 0,
        flexibleSpending: 0,
        debtPayments: 0,
        totalExpenses: 0,
        netChange: 0,
      },
      {
        date: "2026-01-20",
        balance: 3_000,
        goalPurchases: 0,
        cashAfterGoals: 3_000,
        openingBalance: 1_000,
        income: 2_000,
        householdSpending: 0,
        flexibleSpending: 0,
        debtPayments: 0,
        totalExpenses: 0,
        netChange: 2_000,
      },
      {
        date: "2026-01-21",
        balance: 2_100,
        goalPurchases: 0,
        cashAfterGoals: 2_100,
        openingBalance: 1_000,
        income: 2_000,
        householdSpending: 700,
        flexibleSpending: 200,
        debtPayments: 0,
        totalExpenses: 900,
        netChange: 1_100,
      },
      {
        date: "2026-01-22",
        balance: 2_000,
        goalPurchases: 0,
        cashAfterGoals: 2_000,
        openingBalance: 1_000,
        income: 2_000,
        householdSpending: 700,
        flexibleSpending: 200,
        debtPayments: 100,
        totalExpenses: 1_000,
        netChange: 1_000,
      },
    ]);
  });

  test("clamps day 31 cash flows to February month end", () => {
    const startDate = date("2026-02-01");
    const endDate = date("2026-03-01");
    const points = calculateFinanceForecast(
      forecastInput({
        kind: "CUSTOM",
        startDate,
        endDate,
        incomeDayOfMonth: 31,
        householdDayOfMonth: 31,
        flexibleDayOfMonth: 31,
        debtDayOfMonth: 31,
      }),
    ).results.expected.points;

    assert.deepEqual(
      points.map((point) => point.date.toISOString().slice(0, 10)),
      ["2026-02-01", "2026-02-28", "2026-03-01"],
    );
    assert.deepEqual(
      points[1] && {
        balance: points[1].balance,
        income: points[1].income,
        householdSpending: points[1].householdSpending,
        flexibleSpending: points[1].flexibleSpending,
        debtPayments: points[1].debtPayments,
        totalExpenses: points[1].totalExpenses,
        netChange: points[1].netChange,
      },
      {
        balance: 2_000,
        income: 2_000,
        householdSpending: 700,
        flexibleSpending: 200,
        debtPayments: 100,
        totalExpenses: 1_000,
        netChange: 1_000,
      },
    );
  });

  test("projects six-month and custom cycles to their exact final dates", () => {
    const startDate = date("2026-01-15");
    const sixMonthEndDate = deriveFinanceCycleEndDate(
      startDate,
      "SIX_MONTHS",
    );
    const sixMonthForecast = calculateFinanceForecast(
      forecastInput({
        kind: "SIX_MONTHS",
        startDate,
        endDate: sixMonthEndDate,
      }),
    );

    assert.equal(sixMonthForecast.durationMonths, 6);
    assert.equal(sixMonthForecast.results.expected.finalBalance, 7_000);
    assert.equal(sixMonthForecast.results.expected.points.length, 8);
    assert.equal(
      sixMonthForecast.results.expected.points.at(-1)?.date.toISOString(),
      sixMonthEndDate.toISOString(),
    );
    assert.equal(
      sixMonthForecast.results.expected.points.at(-1)?.balance,
      sixMonthForecast.results.expected.finalBalance,
    );

    const customEndDate = date("2026-03-01");
    const customForecast = calculateFinanceForecast(
      forecastInput({
        kind: "CUSTOM",
        startDate,
        endDate: customEndDate,
      }),
    );
    const customDuration = 1.5;
    const customEndpoint = customForecast.results.expected.points.at(-1);

    assert.equal(customForecast.durationMonths, customDuration);
    assert.equal(customForecast.results.expected.points.length, 3);
    assert.equal(customForecast.results.expected.finalBalance, 3_000);
    assert.deepEqual(customEndpoint, {
      date: customEndDate,
      balance: 3_000,
      goalPurchases: 0,
      cashAfterGoals: 3_000,
      openingBalance: 1_000,
      income: 4_000,
      householdSpending: 1_400,
      flexibleSpending: 400,
      debtPayments: 200,
      totalExpenses: 2_000,
      netChange: 2_000,
    });
  });

  test("converts the emergency floor and goals before allocating by priority", () => {
    const forecast = calculateFinanceForecast(
      forecastInput({
        openingAmount: 500,
        monthlyIncome: 0,
        monthlyHousehold: 0,
        monthlyFlexible: 0,
        monthlyDebt: 0,
        emergencyFloor: 400,
        emergencyCurrency: "PEN",
        goals: [
          {
            id: "low-affordable-but-blocked",
            name: "Low priority",
            amount: 20,
            currency: "EUR",
            priority: "LOW",
          },
          {
            id: "high-second",
            name: "Second high priority",
            amount: 250,
            currency: "USD",
            priority: "HIGH",
            position: 2,
          },
          {
            id: "already-funded",
            name: "Already funded",
            amount: 5_000,
            currency: "USD",
            priority: "HIGH",
            status: "FUNDED",
          },
          {
            id: "medium-unaffordable",
            name: "Medium priority",
            amount: 400,
            currency: "PEN",
            priority: "MEDIUM",
          },
          {
            id: "high-first",
            name: "First high priority",
            amount: 80,
            currency: "EUR",
            priority: "HIGH",
            position: 1,
          },
          {
            id: "already-deferred",
            name: "Already deferred",
            amount: 5_000,
            currency: "USD",
            priority: "HIGH",
            status: "DEFERRED",
          },
        ],
      }),
    );
    const expected = forecast.results.expected;

    assert.equal(forecast.emergencyFloor, 100);
    assert.equal(forecast.goalTotal, 475);
    assert.equal(expected.finalBalance, 500);
    assert.equal(expected.availableForGoals, 400);
    assert.equal(expected.goalGap, 75);
    assertClose(expected.fundedPercent, (350 / 475) * 100);
    assert.deepEqual(expected.affordableGoalIds, ["high-first", "high-second"]);
    assert.deepEqual(expected.deferredGoalIds, [
      "medium-unaffordable",
      "low-affordable-but-blocked",
    ]);
  });

  test("deducts only priority-approved active goals from the cash chart at the final point", () => {
    const expected = calculateFinanceForecast(
      forecastInput({
        goals: [
          {
            id: "high-approved",
            name: "High priority purchase",
            amount: 1_500,
            currency: "USD",
            priority: "HIGH",
          },
          {
            id: "medium-approved",
            name: "Medium priority purchase",
            amount: 1_000,
            currency: "USD",
            priority: "MEDIUM",
          },
          {
            id: "low-pending",
            name: "Low priority purchase",
            amount: 200,
            currency: "USD",
            priority: "LOW",
          },
          {
            id: "previously-funded",
            name: "Previously funded purchase",
            amount: 500,
            currency: "USD",
            priority: "HIGH",
            status: "FUNDED",
          },
        ],
      }),
    ).results.expected;
    const finalPoint = expected.points.at(-1);

    assert.equal(expected.finalBalance, 4_000);
    assert.equal(expected.availableForGoals, 2_500);
    assert.equal(expected.goalSpend, 2_500);
    assert.deepEqual(expected.affordableGoalIds, [
      "high-approved",
      "medium-approved",
    ]);
    assert.deepEqual(expected.deferredGoalIds, ["low-pending"]);

    for (const point of expected.points.slice(0, -1)) {
      assert.equal(point.goalPurchases, 0);
      assert.equal(point.cashAfterGoals, point.balance);
    }

    assert.deepEqual(finalPoint && {
      balance: finalPoint.balance,
      goalPurchases: finalPoint.goalPurchases,
      cashAfterGoals: finalPoint.cashAfterGoals,
    }, {
      balance: expected.finalBalance,
      goalPurchases: expected.goalSpend,
      cashAfterGoals: 1_500,
    });
  });
});
