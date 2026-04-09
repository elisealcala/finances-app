import { z } from "zod";

// ============================================
// Enum Schemas
// ============================================

export const recurringFrequencySchema = z.enum([
  "MONTHLY",
  "BIWEEKLY",
  "WEEKLY",
  "QUARTERLY",
  "YEARLY",
]);

export const recurringTypeSchema = z.enum(["INCOME", "EXPENSE"]);

// ============================================
// RecurringTransaction Schemas
// ============================================

export const createRecurringSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  type: recurringTypeSchema,
  frequency: recurringFrequencySchema.optional().default("MONTHLY"),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid().nullable().optional(),
  debtId: z.string().cuid().nullable().optional(),
});

export const updateRecurringSchema = createRecurringSchema.partial().extend({
  id: z.string().cuid(),
});

export const getRecurringByIdSchema = z.object({
  id: z.string().cuid(),
});

export const listRecurringSchema = z
  .object({
    accountId: z.string().cuid().optional(),
    type: recurringTypeSchema.optional(),
    isActive: z.boolean().optional(),
    debtId: z.string().cuid().optional(),
  })
  .optional();

export const deleteRecurringSchema = z.object({
  id: z.string().cuid(),
});

export const createFromDebtSchema = z.object({
  debtId: z.string().cuid(),
  accountId: z.string().cuid(),
});

// ============================================
// FundingLink Schemas
// ============================================

export const createFundingLinkSchema = z.object({
  sourceAccountId: z.string().cuid(),
  debtId: z.string().cuid(),
  notes: z.string().max(500).nullable().optional(),
});

export const deleteFundingLinkSchema = z.object({
  id: z.string().cuid(),
});

export const listFundingLinksSchema = z
  .object({
    accountId: z.string().cuid().optional(),
    debtId: z.string().cuid().optional(),
  })
  .optional();

// ============================================
// Projection Schemas
// ============================================

export const accountAvailableSchema = z.object({
  accountId: z.string().cuid(),
});

export const cashFlowSchema = z
  .object({
    months: z.number().int().min(1).max(24).optional().default(6),
  })
  .optional();

export const upcomingSchema = z
  .object({
    daysAhead: z.number().int().min(1).max(90).optional().default(30),
  })
  .optional();

// ============================================
// Exported Types
// ============================================

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
export type ListRecurringInput = z.infer<typeof listRecurringSchema>;
export type CreateFundingLinkInput = z.infer<typeof createFundingLinkSchema>;
export type ListFundingLinksInput = z.infer<typeof listFundingLinksSchema>;
export type CashFlowInput = z.infer<typeof cashFlowSchema>;
export type UpcomingInput = z.infer<typeof upcomingSchema>;
