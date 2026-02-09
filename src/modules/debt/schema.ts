import { z } from "zod";

export const debtTypeSchema = z.enum([
  "CREDIT_CARD",
  "PERSONAL_LOAN",
  "MORTGAGE",
  "AUTO_LOAN",
  "STUDENT_LOAN",
  "OTHER",
]);

export const debtStatusSchema = z.enum(["ACTIVE", "PAID_OFF"]);

export const createDebtSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: debtTypeSchema,
  balance: z.number().nonnegative("Balance must be non-negative"),
  interestRate: z
    .number()
    .min(0, "Interest rate must be non-negative")
    .max(100, "Interest rate cannot exceed 100%"),
  minimumPayment: z
    .number()
    .nonnegative("Minimum payment must be non-negative"),
  dueDate: z.number().int().min(1).max(31).nullable().optional(),
  lender: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code")
    .nullable()
    .optional(),
  startedAt: z.date().nullable().optional(),
  status: debtStatusSchema.optional().default("ACTIVE"),
});

export const updateDebtSchema = createDebtSchema.partial().extend({
  id: z.string().cuid(),
});

export const getDebtByIdSchema = z.object({
  id: z.string().cuid(),
});

export const listDebtsSchema = z
  .object({
    status: debtStatusSchema.optional(),
    type: debtTypeSchema.optional(),
    sortBy: z
      .enum(["name", "balance", "interestRate", "createdAt"])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .optional();

export const deleteDebtSchema = z.object({
  id: z.string().cuid(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type ListDebtsInput = z.infer<typeof listDebtsSchema>;
