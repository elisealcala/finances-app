import { z } from "zod";

const idSchema = z.string().min(1);
const weightSchema = z.number().positive().max(1000);

export const performanceCycleStatusSchema = z.enum([
  "DRAFT",
  "UPCOMING",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const performanceMeasurementModeSchema = z.enum([
  "NUMBER",
  "PERCENTAGE",
  "MILESTONE",
  "BOOLEAN",
  "MANUAL",
]);

export const performanceConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const careerOutputKindSchema = z.enum([
  "METRIC",
  "MILESTONE",
  "FORM",
  "GITHUB_REPOSITORY",
  "GITHUB_PULL_REQUEST",
  "LINK",
  "FILE",
  "MANUAL",
]);

export const generatedPerformanceKeyResultSchema = z.object({
  title: z.string().trim().min(2).max(200),
  measurementMode: performanceMeasurementModeSchema,
  baseline: z.number().finite(),
  target: z.number().finite(),
  unit: z.string().trim().max(40).nullable(),
  weight: weightSchema,
  weightRationale: z.string().trim().min(5).max(500),
  outputKind: careerOutputKindSchema,
  rubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(3).max(200),
        description: z.string().trim().min(5).max(500),
        weight: z.number().positive().max(100),
      }),
    )
    .min(1)
    .max(6),
});

export const generatedPerformanceOutcomeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  result: z.string().trim().min(10).max(2000),
  impact: z.string().trim().min(5).max(2000),
  weight: weightSchema,
  weightRationale: z.string().trim().min(5).max(500),
  keyResults: z.array(generatedPerformanceKeyResultSchema).min(1).max(4),
});

export const generatedPerformancePlanSchema = z.object({
  desiredResult: z.string().trim().min(10).max(2000),
  outcomes: z.array(generatedPerformanceOutcomeSchema).min(2).max(4),
});

export const generatePerformancePlanSchema = z
  .object({
    context: z.string().trim().max(4000).optional(),
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const createPerformanceCycleFromPlanSchema = generatedPerformancePlanSchema
  .extend({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const createPerformanceCycleSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    desiredResult: z.string().trim().min(10).max(2000),
    startDate: z.date(),
    endDate: z.date(),
    status: performanceCycleStatusSchema.optional(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const updatePerformanceCycleSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(2).max(120).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    desiredResult: z.string().trim().min(10).max(2000).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    status: performanceCycleStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "Provide at least one field to update",
  });

export const createPerformanceOutcomeSchema = z.object({
  cycleId: idSchema,
  title: z.string().trim().min(2).max(120),
  result: z.string().trim().min(10).max(2000),
  impact: z.string().trim().max(2000).optional().nullable(),
  weight: weightSchema.default(1),
  weightRationale: z.string().trim().max(500).optional().nullable(),
});

export const updatePerformanceOutcomeSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(2).max(120).optional(),
  result: z.string().trim().min(10).max(2000).optional(),
  impact: z.string().trim().max(2000).optional().nullable(),
  weight: weightSchema.optional(),
  weightRationale: z.string().trim().max(500).optional().nullable(),
});

export const deletePerformanceOutcomeSchema = z.object({ id: idSchema });

export const createPerformanceKeyResultSchema = z.object({
  outcomeId: idSchema,
  title: z.string().trim().min(2).max(200),
  measurementMode: performanceMeasurementModeSchema,
  baseline: z.number().finite().default(0),
  target: z.number().finite(),
  unit: z.string().trim().max(40).optional().nullable(),
  weight: weightSchema.default(1),
  weightRationale: z.string().trim().max(500).optional().nullable(),
  outputKind: careerOutputKindSchema.default("METRIC"),
  configuration: z.record(z.string(), z.unknown()).optional().nullable(),
  rubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(3).max(200),
        description: z.string().trim().min(5).max(500),
        weight: z.number().positive().max(100),
      }),
    )
    .max(6)
    .optional()
    .nullable(),
});

export const updatePerformanceKeyResultSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(2).max(200).optional(),
  measurementMode: performanceMeasurementModeSchema.optional(),
  baseline: z.number().finite().optional(),
  target: z.number().finite().optional(),
  unit: z.string().trim().max(40).optional().nullable(),
  weight: weightSchema.optional(),
  weightRationale: z.string().trim().max(500).optional().nullable(),
  outputKind: careerOutputKindSchema.optional(),
  configuration: z.record(z.string(), z.unknown()).optional().nullable(),
  rubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(3).max(200),
        description: z.string().trim().min(5).max(500),
        weight: z.number().positive().max(100),
      }),
    )
    .max(6)
    .optional()
    .nullable(),
});

export const deletePerformanceKeyResultSchema = z.object({ id: idSchema });

export const createPerformanceProgressUpdateSchema = z.object({
  keyResultId: idSchema,
  recordedAt: z.date().default(() => new Date()),
  value: z.number().finite().optional().nullable(),
  progressPercent: z.number().min(0).max(100).optional().nullable(),
  confidence: performanceConfidenceSchema.default("MEDIUM"),
  summary: z.string().trim().min(2).max(3000),
  blocker: z.string().trim().max(2000).optional().nullable(),
  nextAction: z.string().trim().max(2000).optional().nullable(),
  evidenceLabel: z.string().trim().max(200).optional().nullable(),
  evidenceUrl: z.string().url().optional().nullable(),
});
