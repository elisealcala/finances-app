import { z } from "zod";

export const listImportsSchema = z
  .object({
    status: z.enum(["PENDING", "IMPORTED", "DISMISSED"]).optional(),
  })
  .optional();

export const confirmImportSchema = z.object({
  id: z.string().cuid(),
  accountId: z.string().cuid().optional(),
  categoryId: z.string().cuid().nullable().optional(),
  payingAccountId: z.string().cuid().nullable().optional(),
});

export const dismissImportSchema = z.object({
  id: z.string().cuid(),
});

export const updatePollSettingsSchema = z.object({
  pollWindowDays: z.number().int().min(1).max(90),
});

export const backfillSchema = z.object({
  from: z.date(),
  to: z.date(),
});
