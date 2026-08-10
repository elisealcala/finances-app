import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  buildPerformanceDashboard,
  type CycleInput,
} from "@/server/trpc/services/performance/progress";

export const careerCycleInclude = {
  snapshots: { orderBy: { recordedAt: "asc" as const } },
  outcomes: {
    orderBy: { position: "asc" as const },
    include: {
      keyResults: {
        orderBy: { position: "asc" as const },
        include: {
          updates: { orderBy: { recordedAt: "desc" as const } },
          submissions: {
            orderBy: { submittedAt: "desc" as const },
            include: {
              evaluations: { orderBy: { createdAt: "desc" as const } },
            },
          },
        },
      },
    },
  },
};

type CareerCycleRecord = Prisma.PerformanceCycleGetPayload<{
  include: typeof careerCycleInclude;
}>;

export function serializeCareerCycle(cycle: CareerCycleRecord, now = new Date()) {
  const input: CycleInput = {
    id: cycle.id,
    desiredResult: cycle.desiredResult,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    status: cycle.status,
    outcomes: cycle.outcomes.map((outcome) => ({
      id: outcome.id,
      title: outcome.title,
      result: outcome.result,
      impact: outcome.impact,
      weight: Number(outcome.weight),
      position: outcome.position,
      keyResults: outcome.keyResults.map((output) => ({
        id: output.id,
        title: output.title,
        measurementMode: output.measurementMode,
        baseline: Number(output.baseline),
        target: Number(output.target),
        unit: output.unit,
        weight: Number(output.weight),
        position: output.position,
        updates: output.updates.map((update) => ({
          id: update.id,
          recordedAt: update.recordedAt,
          value: update.value == null ? null : Number(update.value),
          progressPercent:
            update.progressPercent == null
              ? null
              : Number(update.progressPercent),
          confidence: update.confidence,
          summary: update.summary,
          blocker: update.blocker,
          nextAction: update.nextAction,
          evidenceLabel: update.evidenceLabel,
          evidenceUrl: update.evidenceUrl,
        })),
      })),
    })),
  };
  const dashboard = buildPerformanceDashboard(input, now);

  return {
    ...dashboard,
    title: cycle.title,
    description: cycle.description,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    snapshots: cycle.snapshots.map((snapshot) => ({
      ...snapshot,
      progress: Number(snapshot.progress),
      expectedProgress: Number(snapshot.expectedProgress),
      scopeWeight: Number(snapshot.scopeWeight),
    })),
    outcomes: dashboard.outcomes.map((outcome) => {
      const record = cycle.outcomes.find((item) => item.id === outcome.id)!;
      return {
        ...outcome,
        weightRationale: record.weightRationale,
        keyResults: outcome.keyResults.map((output) => {
          const outputRecord = record.keyResults.find(
            (item) => item.id === output.id,
          )!;
          return {
            ...output,
            outputKind: outputRecord.outputKind,
            weightRationale: outputRecord.weightRationale,
            configuration: outputRecord.configuration,
            rubric: outputRecord.rubric,
            submissions: outputRecord.submissions.map((submission) => ({
              ...submission,
              evaluations: submission.evaluations.map((evaluation) => ({
                ...evaluation,
                score: Number(evaluation.score),
              })),
            })),
          };
        }),
      };
    }),
  };
}

export async function recordCareerProgressSnapshot(
  database: Pick<PrismaClient, "performanceCycle" | "careerProgressSnapshot">,
  cycleId: string,
  source: string,
) {
  const cycle = await database.performanceCycle.findUnique({
    where: { id: cycleId },
    include: careerCycleInclude,
  });
  if (!cycle) return null;
  const dashboard = serializeCareerCycle(cycle);
  const scopeWeight = dashboard.outcomes.reduce(
    (sum, outcome) => sum + Math.max(0, outcome.weight),
    0,
  );
  return database.careerProgressSnapshot.create({
    data: {
      cycleId,
      progress: new Prisma.Decimal(dashboard.progress),
      expectedProgress: new Prisma.Decimal(dashboard.expectedProgress),
      scopeWeight: new Prisma.Decimal(scopeWeight),
      source,
    },
  });
}
