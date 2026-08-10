import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createPerformanceCycleFromPlanSchema,
  generatePerformancePlanSchema,
  generatedPerformancePlanSchema,
} from "./performance.schema";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

function createKeyResult(overrides: Record<string, unknown> = {}) {
  return {
    title: "Ship a measurable improvement",
    measurementMode: "NUMBER",
    baseline: 10,
    target: 25,
    unit: "deliveries",
    weight: 1,
    weightRationale: "This output directly proves the expected result.",
    outputKind: "GITHUB_REPOSITORY",
    rubric: [
      {
        criterion: "Implementation quality",
        description: "The implementation is complete, reliable, and maintainable.",
        weight: 100,
      },
    ],
    ...overrides,
  };
}

function createOutcome(
  title: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    title,
    result: "Deliver an observable result that improves team performance.",
    impact: "Creates a measurable improvement for the team.",
    weight: 1,
    weightRationale: "This outcome is central to the desired career result.",
    keyResults: [createKeyResult()],
    ...overrides,
  };
}

function createPlan(overrides: Record<string, unknown> = {}) {
  return {
    desiredResult:
      "Become a consistently high-impact contributor over the next six months.",
    outcomes: [
      createOutcome("Improve delivery consistency"),
      createOutcome("Increase team leverage"),
    ],
    ...overrides,
  };
}

describe("generatedPerformancePlanSchema", () => {
  test("accepts generated outcomes without knowledge sync metadata", () => {
    const result = generatedPerformancePlanSchema.safeParse(createPlan());

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal("knowledgeTags" in result.data.outcomes[0]!, false);
    }
  });

  test("rejects a plan with fewer than two outcomes", () => {
    const result = generatedPerformancePlanSchema.safeParse(
      createPlan({ outcomes: [createOutcome("Only outcome")] }),
    );

    assert.equal(result.success, false);
  });

  test("rejects an outcome with more than four key results", () => {
    const result = generatedPerformancePlanSchema.safeParse(
      createPlan({
        outcomes: [
          createOutcome("Improve delivery consistency", {
            keyResults: Array.from({ length: 5 }, (_, index) =>
              createKeyResult({ title: `Key result ${index + 1}` }),
            ),
          }),
          createOutcome("Increase team leverage"),
        ],
      }),
    );

    assert.equal(result.success, false);
  });

  test("rejects an unsupported measurement mode", () => {
    const result = generatedPerformancePlanSchema.safeParse(
      createPlan({
        outcomes: [
          createOutcome("Improve delivery consistency", {
            keyResults: [createKeyResult({ measurementMode: "CURRENCY" })],
          }),
          createOutcome("Increase team leverage"),
        ],
      }),
    );

    assert.equal(result.success, false);
  });

  test("requires a weight rationale for every generated outcome", () => {
    const outcomeWithoutRationale: Record<string, unknown> = createOutcome(
      "Improve delivery consistency",
    );
    delete outcomeWithoutRationale.weightRationale;

    const result = generatedPerformancePlanSchema.safeParse(
      createPlan({
        outcomes: [
          outcomeWithoutRationale,
          createOutcome("Increase team leverage"),
        ],
      }),
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.error.issues[0]?.path, [
        "outcomes",
        0,
        "weightRationale",
      ]);
    }
  });

  test("requires output kind, weight rationale, and rubric for every key result", () => {
    for (const field of ["outputKind", "weightRationale", "rubric"] as const) {
      const keyResultWithoutField: Record<string, unknown> = createKeyResult();
      delete keyResultWithoutField[field];

      const result = generatedPerformancePlanSchema.safeParse(
        createPlan({
          outcomes: [
            createOutcome("Improve delivery consistency", {
              keyResults: [keyResultWithoutField],
            }),
            createOutcome("Increase team leverage"),
          ],
        }),
      );

      assert.equal(result.success, false);
      if (!result.success) {
        assert.deepEqual(result.error.issues[0]?.path, [
          "outcomes",
          0,
          "keyResults",
          0,
          field,
        ]);
      }
    }
  });

  test("rejects a generated key result with an empty rubric", () => {
    const result = generatedPerformancePlanSchema.safeParse(
      createPlan({
        outcomes: [
          createOutcome("Improve delivery consistency", {
            keyResults: [createKeyResult({ rubric: [] })],
          }),
          createOutcome("Increase team leverage"),
        ],
      }),
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.error.issues[0]?.path, [
        "outcomes",
        0,
        "keyResults",
        0,
        "rubric",
      ]);
    }
  });

});

test("generatePerformancePlanSchema rejects an end date before the start date", () => {
  const result = generatePerformancePlanSchema.safeParse({
    context: "Focus on becoming more effective at cross-team delivery.",
    startDate: date("2026-08-05"),
    endDate: date("2026-08-04"),
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0]?.path, ["endDate"]);
  }
});

describe("createPerformanceCycleFromPlanSchema", () => {
  test("accepts a generated plan with a valid cycle date range", () => {
    const result = createPerformanceCycleFromPlanSchema.safeParse({
      ...createPlan(),
      startDate: date("2026-08-05"),
      endDate: date("2027-02-05"),
    });

    assert.equal(result.success, true);
  });

  test("rejects a generated plan with an invalid cycle date range", () => {
    const result = createPerformanceCycleFromPlanSchema.safeParse({
      ...createPlan(),
      startDate: date("2026-08-05"),
      endDate: date("2026-08-05"),
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.deepEqual(result.error.issues[0]?.path, ["endDate"]);
    }
  });
});
