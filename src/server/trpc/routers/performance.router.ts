import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";
import { router, publicProcedure } from "@/server/trpc/init";
import {
  createPerformanceCycleSchema,
  createPerformanceCycleFromPlanSchema,
  createPerformanceKeyResultSchema,
  createPerformanceOutcomeSchema,
  createPerformanceProgressUpdateSchema,
  deletePerformanceKeyResultSchema,
  deletePerformanceOutcomeSchema,
  generatePerformancePlanSchema,
  updatePerformanceCycleSchema,
  updatePerformanceKeyResultSchema,
  updatePerformanceOutcomeSchema,
} from "@/server/trpc/schemas/performance.schema";
import { buildPerformanceDashboard } from "@/server/trpc/services/performance/progress";
import { generatePerformancePlan } from "@/server/performance/generator";
import { recordCareerProgressSnapshot } from "@/server/career/dashboard";

const dashboardInclude = {
  outcomes: {
    orderBy: { position: "asc" as const },
    include: {
      keyResults: {
        orderBy: { position: "asc" as const },
        include: {
          updates: { orderBy: { recordedAt: "desc" as const } },
        },
      },
    },
  },
};

function validateProgressMeasurement(input: {
  measurementMode: string;
  value?: number | null;
  progressPercent?: number | null;
}) {
  const usesMeasuredValue =
    input.measurementMode === "NUMBER" ||
    input.measurementMode === "PERCENTAGE" ||
    input.measurementMode === "BOOLEAN";
  if (usesMeasuredValue && input.value == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This key result requires a current value",
    });
  }
  if (!usesMeasuredValue && input.progressPercent == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This key result requires a progress percentage",
    });
  }
}

function notFound(label: string, id: string): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: `${label} ${id} not found`,
  });
}

export const performanceRouter = router({
  dashboard: publicProcedure.query(async ({ ctx }) => {
    const cycle = await ctx.db.performanceCycle.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      include: dashboardInclude,
    });

    if (!cycle) return null;

    return buildPerformanceDashboard({
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
        keyResults: outcome.keyResults.map((keyResult) => ({
          id: keyResult.id,
          title: keyResult.title,
          measurementMode: keyResult.measurementMode,
          baseline: Number(keyResult.baseline),
          target: Number(keyResult.target),
          unit: keyResult.unit,
          weight: Number(keyResult.weight),
          position: keyResult.position,
          updates: keyResult.updates.map((update) => ({
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
    });
  }),

  cycle: router({
    createFromPlan: publicProcedure
      .input(createPerformanceCycleFromPlanSchema)
      .mutation(async ({ ctx, input }) => {
        const active = await ctx.db.performanceCycle.findFirst({
          where: { status: "ACTIVE" },
          select: { id: true },
        });
        const cycle = await ctx.db.performanceCycle.create({
          data: {
            desiredResult: input.desiredResult,
            startDate: input.startDate,
            endDate: input.endDate,
            status:
              active || input.startDate > new Date() ? "UPCOMING" : "ACTIVE",
            outcomes: {
              create: input.outcomes.map((outcome, outcomeIndex) => ({
                title: outcome.title,
                result: outcome.result,
                impact: outcome.impact,
                weight: new Prisma.Decimal(outcome.weight),
                weightRationale: outcome.weightRationale,
                position: outcomeIndex,
                keyResults: {
                  create: outcome.keyResults.map((keyResult, keyResultIndex) => ({
                    title: keyResult.title,
                    measurementMode: keyResult.measurementMode,
                    baseline: new Prisma.Decimal(keyResult.baseline),
                    target: new Prisma.Decimal(keyResult.target),
                    unit: keyResult.unit,
                    weight: new Prisma.Decimal(keyResult.weight),
                    weightRationale: keyResult.weightRationale,
                    outputKind: keyResult.outputKind,
                    rubric: keyResult.rubric,
                    position: keyResultIndex,
                  })),
                },
              })),
            },
          },
        });
        await recordCareerProgressSnapshot(ctx.db, cycle.id, "cycle:created");
        return cycle;
      }),

    create: publicProcedure
      .input(createPerformanceCycleSchema)
      .mutation(async ({ ctx, input }) => {
        const active = await ctx.db.performanceCycle.findFirst({
          where: { status: "ACTIVE" },
          select: { id: true },
        });
        const cycle = await ctx.db.performanceCycle.create({
          data: {
            ...input,
            title: input.title || null,
            description: input.description || null,
            status:
              input.status ??
              (active || input.startDate > new Date() ? "UPCOMING" : "ACTIVE"),
          },
        });
        await recordCareerProgressSnapshot(ctx.db, cycle.id, "cycle:created");
        return cycle;
      }),

    update: publicProcedure
      .input(updatePerformanceCycleSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.performanceCycle.findUnique({
          where: { id: input.id },
        });
        if (!existing) throw notFound("Performance cycle", input.id);

        const startDate = input.startDate ?? existing.startDate;
        const endDate = input.endDate ?? existing.endDate;
        if (endDate <= startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after the start date",
          });
        }

        if (input.status === "ACTIVE") {
          const otherActive = await ctx.db.performanceCycle.findFirst({
            where: { status: "ACTIVE", id: { not: input.id } },
            select: { id: true },
          });
          if (otherActive) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Complete the current active cycle before activating another",
            });
          }
        }

        const { id, ...data } = input;
        const cycle = await ctx.db.performanceCycle.update({ where: { id }, data });
        await recordCareerProgressSnapshot(ctx.db, cycle.id, "cycle:updated");
        return cycle;
      }),
  }),

  plan: router({
    generate: publicProcedure
      .input(generatePerformancePlanSchema)
      .mutation(async ({ input }) => generatePerformancePlan(input)),
  }),

  outcome: router({
    create: publicProcedure
      .input(createPerformanceOutcomeSchema)
      .mutation(async ({ ctx, input }) => {
        const cycle = await ctx.db.performanceCycle.findUnique({
          where: { id: input.cycleId },
          select: { id: true, status: true },
        });
        if (!cycle) throw notFound("Performance cycle", input.cycleId);
        if (cycle.status !== "ACTIVE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Outcomes can only be added to an active cycle",
          });
        }

        const position = await ctx.db.performanceOutcome.count({
          where: { cycleId: input.cycleId },
        });
        const { cycleId, ...outcomeInput } = input;
        return ctx.db.performanceOutcome.create({
          data: {
            ...outcomeInput,
            cycleId,
            impact: input.impact || null,
            weight: new Prisma.Decimal(input.weight),
            position,
          },
        });
      }),

    update: publicProcedure
      .input(updatePerformanceOutcomeSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, weight, impact, ...rest } = input;
        try {
          return await ctx.db.performanceOutcome.update({
            where: { id },
            data: {
              ...rest,
              ...(weight !== undefined && {
                weight: new Prisma.Decimal(weight),
              }),
              ...(impact !== undefined && { impact: impact || null }),
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            throw notFound("Performance outcome", id);
          }
          throw error;
        }
      }),

    delete: publicProcedure
      .input(deletePerformanceOutcomeSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await ctx.db.performanceOutcome.delete({ where: { id: input.id } });
          return { success: true };
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            throw notFound("Performance outcome", input.id);
          }
          throw error;
        }
      }),
  }),

  keyResult: router({
    create: publicProcedure
      .input(createPerformanceKeyResultSchema)
      .mutation(async ({ ctx, input }) => {
        const outcome = await ctx.db.performanceOutcome.findUnique({
          where: { id: input.outcomeId },
          select: { id: true },
        });
        if (!outcome) throw notFound("Performance outcome", input.outcomeId);

        const position = await ctx.db.performanceKeyResult.count({
          where: { outcomeId: input.outcomeId },
        });
        const { configuration, rubric, ...keyResultInput } = input;
        return ctx.db.performanceKeyResult.create({
          data: {
            ...keyResultInput,
            configuration:
              configuration === null || configuration === undefined
                ? Prisma.DbNull
                : (configuration as Prisma.InputJsonValue),
            rubric:
              rubric === null || rubric === undefined
                ? Prisma.DbNull
                : (rubric as Prisma.InputJsonValue),
            unit: input.unit || null,
            baseline: new Prisma.Decimal(input.baseline),
            target: new Prisma.Decimal(input.target),
            weight: new Prisma.Decimal(input.weight),
            position,
          },
        });
      }),

    update: publicProcedure
      .input(updatePerformanceKeyResultSchema)
      .mutation(async ({ ctx, input }) => {
        const {
          id,
          baseline,
          target,
          weight,
          unit,
          configuration,
          rubric,
          ...rest
        } = input;
        try {
          return await ctx.db.performanceKeyResult.update({
            where: { id },
            data: {
              ...rest,
              ...(configuration !== undefined && {
                configuration:
                  configuration === null
                    ? Prisma.DbNull
                    : (configuration as Prisma.InputJsonValue),
              }),
              ...(rubric !== undefined && {
                rubric:
                  rubric === null
                    ? Prisma.DbNull
                    : (rubric as Prisma.InputJsonValue),
              }),
              ...(baseline !== undefined && {
                baseline: new Prisma.Decimal(baseline),
              }),
              ...(target !== undefined && {
                target: new Prisma.Decimal(target),
              }),
              ...(weight !== undefined && {
                weight: new Prisma.Decimal(weight),
              }),
              ...(unit !== undefined && { unit: unit || null }),
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            throw notFound("Key result", id);
          }
          throw error;
        }
      }),

    delete: publicProcedure
      .input(deletePerformanceKeyResultSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await ctx.db.performanceKeyResult.delete({ where: { id: input.id } });
          return { success: true };
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            throw notFound("Key result", input.id);
          }
          throw error;
        }
      }),
  }),

  progress: router({
    create: publicProcedure
      .input(createPerformanceProgressUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const keyResult = await ctx.db.performanceKeyResult.findUnique({
          where: { id: input.keyResultId },
          select: {
            id: true,
            measurementMode: true,
            outcome: { select: { cycleId: true } },
          },
        });
        if (!keyResult) throw notFound("Key result", input.keyResultId);

        validateProgressMeasurement({
          measurementMode: keyResult.measurementMode,
          value: input.value,
          progressPercent: input.progressPercent,
        });

        const update = await ctx.db.performanceProgressUpdate.create({
          data: {
            ...input,
            value:
              input.value == null ? null : new Prisma.Decimal(input.value),
            progressPercent:
              input.progressPercent == null
                ? null
                : new Prisma.Decimal(input.progressPercent),
            blocker: input.blocker || null,
            nextAction: input.nextAction || null,
            evidenceLabel: input.evidenceLabel || null,
            evidenceUrl: input.evidenceUrl || null,
          },
        });
        await recordCareerProgressSnapshot(
          ctx.db,
          keyResult.outcome.cycleId,
          "progress:manual",
        );
        return update;
      }),
  }),

});
