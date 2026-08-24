import { z } from "zod";

export const hubTaskStatuses = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELED",
] as const;

export const hubTaskPriorities = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
] as const;

export const hubIdeaStages = [
  "RAW",
  "EXPLORING",
  "PRIORITIZED",
  "IN_ACTION",
  "ARCHIVED",
] as const;

export const hubIdeaCategories = [
  "Side Project",
  "Career",
  "Life & Health",
  "Tech & Tools",
  "Creative",
  "Financial",
] as const;

const idSchema = z.string().min(1);
const nullableText = z.string().trim().max(20_000).nullable().optional();

export const hubIdSchema = z.object({ id: idSchema });

export const hubTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: nullableText,
  status: z.enum(hubTaskStatuses).default("TODO"),
  priority: z.enum(hubTaskPriorities).default("NONE"),
  dueDate: z.coerce.date().nullable().optional(),
  estimatePoints: z.number().int().min(1).max(100).nullable().optional(),
  projectId: idSchema.nullable().optional(),
  labelIds: z.array(idSchema).max(50).default([]),
  sourceIdeaId: idSchema.nullable().optional(),
});

export const hubTaskUpdateSchema = hubTaskCreateSchema
  .partial()
  .extend({ id: idSchema });

export const hubSubtaskCreateSchema = z.object({
  taskId: idSchema,
  title: z.string().trim().min(1).max(300),
});

export const hubSubtaskUpdateSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(300).optional(),
  completed: z.boolean().optional(),
});

export const hubIdeaCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(20_000).default(""),
  category: z.enum(hubIdeaCategories).default("Side Project"),
  stage: z.enum(hubIdeaStages).default("RAW"),
  impact: z.number().int().min(1).max(5).default(3),
  effort: z.number().int().min(1).max(5).default(2),
  confidence: z.number().int().min(1).max(5).default(4),
  projectId: idSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  targetQuarter: z.string().trim().max(100).nullable().optional(),
  notes: nullableText,
});

export const hubIdeaUpdateSchema = hubIdeaCreateSchema
  .partial()
  .extend({ id: idSchema });

export const hubProjectCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().trim().max(50).nullable().optional(),
  description: nullableText,
});

export const hubProjectUpdateSchema = hubProjectCreateSchema
  .partial()
  .extend({ id: idSchema });

export const hubLabelCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const hubLabelUpdateSchema = hubLabelCreateSchema
  .partial()
  .extend({ id: idSchema });
