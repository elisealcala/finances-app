import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildPerformanceDashboard,
  calculateExpectedProgress,
  calculateKeyResultProgress,
  calculateWeightedProgress,
  derivePerformanceHealth,
  type CycleInput,
  type KeyResultInput,
  type ProgressUpdateInput,
} from "./progress";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

function createUpdate(
  overrides: Partial<ProgressUpdateInput> = {},
): ProgressUpdateInput {
  return {
    id: "update-1",
    recordedAt: date("2026-06-05"),
    value: null,
    progressPercent: null,
    confidence: "HIGH",
    summary: "Progress update",
    blocker: null,
    nextAction: null,
    evidenceLabel: null,
    evidenceUrl: null,
    ...overrides,
  };
}

function createKeyResult(
  overrides: Partial<KeyResultInput> = {},
): KeyResultInput {
  return {
    id: "kr-1",
    title: "Key result",
    measurementMode: "NUMBER",
    baseline: 0,
    target: 100,
    unit: null,
    weight: 1,
    position: 0,
    updates: [],
    ...overrides,
  };
}

describe("calculateKeyResultProgress", () => {
  test("calculates increasing numeric targets and clamps values outside the range", () => {
    const keyResult = createKeyResult({
      baseline: 20,
      target: 100,
      updates: [createUpdate({ value: 60 })],
    });

    assert.equal(calculateKeyResultProgress(keyResult), 50);
    assert.equal(
      calculateKeyResultProgress({
        ...keyResult,
        updates: [createUpdate({ value: 0 })],
      }),
      0,
    );
    assert.equal(
      calculateKeyResultProgress({
        ...keyResult,
        updates: [createUpdate({ value: 140 })],
      }),
      100,
    );
  });

  test("calculates decreasing numeric targets and clamps values outside the range", () => {
    const keyResult = createKeyResult({
      baseline: 100,
      target: 20,
      updates: [createUpdate({ value: 60 })],
    });

    assert.equal(calculateKeyResultProgress(keyResult), 50);
    assert.equal(
      calculateKeyResultProgress({
        ...keyResult,
        updates: [createUpdate({ value: 120 })],
      }),
      0,
    );
    assert.equal(
      calculateKeyResultProgress({
        ...keyResult,
        updates: [createUpdate({ value: 0 })],
      }),
      100,
    );
  });

  test("uses explicit progress for manual and milestone modes", () => {
    assert.equal(
      calculateKeyResultProgress(
        createKeyResult({
          measurementMode: "MANUAL",
          updates: [createUpdate({ progressPercent: 37 })],
        }),
      ),
      37,
    );
    assert.equal(
      calculateKeyResultProgress(
        createKeyResult({
          measurementMode: "MILESTONE",
          updates: [createUpdate({ progressPercent: 125 })],
        }),
      ),
      100,
    );
    assert.equal(
      calculateKeyResultProgress(
        createKeyResult({
          measurementMode: "MANUAL",
          updates: [createUpdate({ progressPercent: -10 })],
        }),
      ),
      0,
    );
  });

  test("treats boolean values of one or greater as complete", () => {
    const booleanKeyResult = createKeyResult({ measurementMode: "BOOLEAN" });

    assert.equal(
      calculateKeyResultProgress({
        ...booleanKeyResult,
        updates: [createUpdate({ value: 1 })],
      }),
      100,
    );
    assert.equal(
      calculateKeyResultProgress({
        ...booleanKeyResult,
        updates: [createUpdate({ value: 0 })],
      }),
      0,
    );
    assert.equal(
      calculateKeyResultProgress({
        ...booleanKeyResult,
        updates: [createUpdate({ value: null })],
      }),
      0,
    );
  });
});

describe("calculateWeightedProgress", () => {
  test("rolls progress up by positive weights", () => {
    assert.equal(
      calculateWeightedProgress([
        { progress: 20, weight: 1 },
        { progress: 80, weight: 3 },
      ]),
      65,
    );
  });

  test("ignores negative weights and averages when all weights are zero", () => {
    assert.equal(
      calculateWeightedProgress([
        { progress: 10, weight: -1 },
        { progress: 80, weight: 2 },
      ]),
      80,
    );
    assert.equal(
      calculateWeightedProgress([
        { progress: 20, weight: 0 },
        { progress: 80, weight: 0 },
      ]),
      50,
    );
  });
});

test("calculateExpectedProgress handles dates before, during, and after a cycle", () => {
  const startDate = date("2026-06-01");
  const endDate = date("2026-06-11");

  assert.equal(
    calculateExpectedProgress(startDate, endDate, date("2026-05-31")),
    0,
  );
  assert.equal(
    calculateExpectedProgress(startDate, endDate, date("2026-06-06")),
    50,
  );
  assert.equal(
    calculateExpectedProgress(startDate, endDate, date("2026-06-12")),
    100,
  );
});

describe("derivePerformanceHealth", () => {
  const now = date("2026-06-20");
  const freshUpdate = date("2026-06-19");

  test("marks complete progress as complete even when other risks exist", () => {
    assert.equal(
      derivePerformanceHealth({
        progress: 100,
        expectedProgress: 100,
        lastUpdatedAt: date("2026-01-01"),
        hasBlocker: true,
        now,
      }),
      "COMPLETE",
    );
  });

  test("keeps sufficiently current and unblocked progress on track", () => {
    assert.equal(
      derivePerformanceHealth({
        progress: 40,
        expectedProgress: 50,
        lastUpdatedAt: freshUpdate,
        hasBlocker: false,
        now,
      }),
      "ON_TRACK",
    );
  });

  test("marks progress at risk for variance, a blocker, or a stale update", () => {
    const cases = [
      {
        progress: 39,
        expectedProgress: 50,
        lastUpdatedAt: freshUpdate,
        hasBlocker: false,
      },
      {
        progress: 50,
        expectedProgress: 50,
        lastUpdatedAt: freshUpdate,
        hasBlocker: true,
      },
      {
        progress: 50,
        expectedProgress: 50,
        lastUpdatedAt: date("2026-06-05"),
        hasBlocker: false,
      },
    ];

    for (const input of cases) {
      assert.equal(derivePerformanceHealth({ ...input, now }), "AT_RISK");
    }
  });

  test("marks progress more than 25 points behind as off track", () => {
    assert.equal(
      derivePerformanceHealth({
        progress: 24,
        expectedProgress: 50,
        lastUpdatedAt: freshUpdate,
        hasBlocker: false,
        now,
      }),
      "OFF_TRACK",
    );
  });
});

test("buildPerformanceDashboard rolls up progress and current execution details", () => {
  const blockedUpdate = createUpdate({
    id: "update-blocked",
    recordedAt: date("2026-06-04"),
    value: 30,
    summary: "Reached the numeric target",
    blocker: "Waiting for stakeholder approval",
    nextAction: "Schedule the approval review",
  });
  const manualUpdate = createUpdate({
    id: "update-manual",
    recordedAt: date("2026-06-05"),
    progressPercent: 0,
    summary: "Milestone has not started",
  });
  const booleanUpdate = createUpdate({
    id: "update-boolean",
    recordedAt: date("2026-06-06"),
    value: 0,
    summary: "Launch is pending",
    nextAction: "Complete the launch checklist",
  });
  const cycle: CycleInput = {
    id: "cycle-1",
    desiredResult: "Demonstrate six months of measurable impact",
    startDate: date("2026-06-01"),
    endDate: date("2026-06-11"),
    status: "ACTIVE",
    outcomes: [
      {
        id: "outcome-1",
        title: "Delivery",
        result: "Ship the priority work",
        impact: null,
        weight: 3,
        position: 0,
        keyResults: [
          createKeyResult({
            id: "kr-numeric",
            baseline: 10,
            target: 30,
            weight: 3,
            updates: [blockedUpdate],
          }),
          createKeyResult({
            id: "kr-manual",
            measurementMode: "MANUAL",
            weight: 1,
            updates: [manualUpdate],
          }),
        ],
      },
      {
        id: "outcome-2",
        title: "Launch",
        result: "Launch the new capability",
        impact: null,
        weight: 1,
        position: 1,
        keyResults: [
          createKeyResult({
            id: "kr-boolean",
            measurementMode: "BOOLEAN",
            updates: [booleanUpdate],
          }),
        ],
      },
    ],
  };

  const dashboard = buildPerformanceDashboard(cycle, date("2026-06-06"));

  assert.equal(dashboard.outcomes[0]?.progress, 75);
  assert.equal(dashboard.outcomes[1]?.progress, 0);
  assert.equal(dashboard.progress, 56.25);
  assert.equal(dashboard.expectedProgress, 50);
  assert.equal(dashboard.variance, 6.25);
  assert.equal(dashboard.health, "AT_RISK");
  assert.deepEqual(dashboard.lastUpdatedAt, date("2026-06-06"));
  assert.deepEqual(
    dashboard.outcomes[1]?.keyResults[0]?.latestUpdate,
    booleanUpdate,
  );
  assert.deepEqual(dashboard.blockers, [
    {
      outcomeId: "outcome-1",
      keyResultId: "kr-numeric",
      blocker: "Waiting for stakeholder approval",
    },
  ]);
  assert.deepEqual(dashboard.nextActions, [
    {
      outcomeId: "outcome-1",
      keyResultId: "kr-numeric",
      nextAction: "Schedule the approval review",
    },
    {
      outcomeId: "outcome-2",
      keyResultId: "kr-boolean",
      nextAction: "Complete the launch checklist",
    },
  ]);
  assert.equal(dashboard.daysRemaining, 5);
});
