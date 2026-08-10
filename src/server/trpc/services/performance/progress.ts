export type PerformanceMeasurementMode =
  | "NUMBER"
  | "PERCENTAGE"
  | "MILESTONE"
  | "BOOLEAN"
  | "MANUAL";

export type PerformanceHealth =
  | "ON_TRACK"
  | "AT_RISK"
  | "OFF_TRACK"
  | "COMPLETE";

export type ProgressUpdateInput = {
  id: string;
  recordedAt: Date;
  value: number | null;
  progressPercent: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  blocker: string | null;
  nextAction: string | null;
  evidenceLabel: string | null;
  evidenceUrl: string | null;
};

export type KeyResultInput = {
  id: string;
  title: string;
  measurementMode: PerformanceMeasurementMode;
  baseline: number;
  target: number;
  unit: string | null;
  weight: number;
  position: number;
  updates: ProgressUpdateInput[];
};

export type OutcomeInput = {
  id: string;
  title: string;
  result: string;
  impact: string | null;
  weight: number;
  position: number;
  keyResults: KeyResultInput[];
};

export type CycleInput = {
  id: string;
  desiredResult: string;
  startDate: Date;
  endDate: Date;
  status: "DRAFT" | "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  outcomes: OutcomeInput[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_UPDATE_DAYS = 14;

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function calculateKeyResultProgress(
  keyResult: Pick<
    KeyResultInput,
    "measurementMode" | "baseline" | "target" | "updates"
  >,
): number {
  const latest = keyResult.updates[0];
  if (!latest) return 0;

  if (
    keyResult.measurementMode === "MILESTONE" ||
    keyResult.measurementMode === "MANUAL"
  ) {
    return clampPercent(latest.progressPercent ?? 0);
  }

  if (keyResult.measurementMode === "BOOLEAN") {
    return latest.value != null && latest.value >= 1 ? 100 : 0;
  }

  const current = latest.value ?? keyResult.baseline;
  const distance = keyResult.target - keyResult.baseline;
  if (distance === 0) return current === keyResult.target ? 100 : 0;

  return clampPercent(((current - keyResult.baseline) / distance) * 100);
}

export function calculateWeightedProgress(
  items: Array<{ progress: number; weight: number }>,
): number {
  if (items.length === 0) return 0;

  const totalWeight = items.reduce(
    (sum, item) => sum + Math.max(0, item.weight),
    0,
  );
  if (totalWeight === 0) {
    return (
      items.reduce((sum, item) => sum + item.progress, 0) / items.length
    );
  }

  return clampPercent(
    items.reduce(
      (sum, item) => sum + item.progress * Math.max(0, item.weight),
      0,
    ) / totalWeight,
  );
}

export function calculateExpectedProgress(
  startDate: Date,
  endDate: Date,
  now: Date,
): number {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const current = now.getTime();

  if (current <= start) return 0;
  if (current >= end) return 100;
  if (end <= start) return 0;

  return clampPercent(((current - start) / (end - start)) * 100);
}

export function derivePerformanceHealth(input: {
  progress: number;
  expectedProgress: number;
  lastUpdatedAt: Date | null;
  hasBlocker: boolean;
  now: Date;
}): PerformanceHealth {
  if (input.progress >= 100) return "COMPLETE";

  const variance = input.progress - input.expectedProgress;
  if (variance < -25) return "OFF_TRACK";

  const isStale =
    input.lastUpdatedAt != null &&
    input.now.getTime() - input.lastUpdatedAt.getTime() >
      STALE_UPDATE_DAYS * DAY_MS;

  if (variance < -10 || input.hasBlocker || isStale) return "AT_RISK";
  return "ON_TRACK";
}

export function buildPerformanceDashboard(cycle: CycleInput, now = new Date()) {
  const expectedProgress = calculateExpectedProgress(
    cycle.startDate,
    cycle.endDate,
    now,
  );

  const outcomes = cycle.outcomes.map((outcome) => {
    const keyResults = outcome.keyResults.map((keyResult) => {
      const latestUpdate = keyResult.updates[0] ?? null;
      const progress = calculateKeyResultProgress(keyResult);
      const health = derivePerformanceHealth({
        progress,
        expectedProgress,
        lastUpdatedAt: latestUpdate?.recordedAt ?? null,
        hasBlocker: Boolean(latestUpdate?.blocker),
        now,
      });

      return {
        ...keyResult,
        progress,
        health,
        currentValue: latestUpdate?.value ?? keyResult.baseline,
        latestUpdate,
      };
    });

    const progress = calculateWeightedProgress(
      keyResults.map((keyResult) => ({
        progress: keyResult.progress,
        weight: keyResult.weight,
      })),
    );
    const lastUpdatedAt = keyResults.reduce<Date | null>((latest, keyResult) => {
      const date = keyResult.latestUpdate?.recordedAt;
      if (!date || (latest && latest >= date)) return latest;
      return date;
    }, null);
    const hasBlocker = keyResults.some(
      (keyResult) => keyResult.latestUpdate?.blocker,
    );

    return {
      ...outcome,
      keyResults,
      progress,
      health: derivePerformanceHealth({
        progress,
        expectedProgress,
        lastUpdatedAt,
        hasBlocker,
        now,
      }),
      lastUpdatedAt,
    };
  });

  const progress = calculateWeightedProgress(
    outcomes.map((outcome) => ({
      progress: outcome.progress,
      weight: outcome.weight,
    })),
  );
  const lastUpdatedAt = outcomes.reduce<Date | null>((latest, outcome) => {
    const date = outcome.lastUpdatedAt;
    if (!date || (latest && latest >= date)) return latest;
    return date;
  }, null);
  const hasBlocker = outcomes.some((outcome) =>
    outcome.keyResults.some((keyResult) => keyResult.latestUpdate?.blocker),
  );

  const blockers = outcomes.flatMap((outcome) =>
    outcome.keyResults.flatMap((keyResult) => {
      const blocker = keyResult.latestUpdate?.blocker;
      return blocker
        ? [{ outcomeId: outcome.id, keyResultId: keyResult.id, blocker }]
        : [];
    }),
  );
  const nextActions = outcomes.flatMap((outcome) =>
    outcome.keyResults.flatMap((keyResult) => {
      const nextAction = keyResult.latestUpdate?.nextAction;
      return nextAction
        ? [{ outcomeId: outcome.id, keyResultId: keyResult.id, nextAction }]
        : [];
    }),
  );

  return {
    ...cycle,
    outcomes,
    progress,
    expectedProgress,
    variance: progress - expectedProgress,
    health: derivePerformanceHealth({
      progress,
      expectedProgress,
      lastUpdatedAt,
      hasBlocker,
      now,
    }),
    lastUpdatedAt,
    blockers,
    nextActions,
    daysRemaining: Math.max(
      0,
      Math.ceil((cycle.endDate.getTime() - now.getTime()) / DAY_MS),
    ),
  };
}
