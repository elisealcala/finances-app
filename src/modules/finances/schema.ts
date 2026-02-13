import { z } from "zod";

// ============================================
// Enum Schemas
// ============================================

export const accountTypeSchema = z.enum([
  "BANK",
  "CREDIT_CARD",
  "CASH",
  "SAVINGS",
  "INVESTMENT",
  "OTHER",
]);

export const paymentStatusSchema = z.enum(["PAID", "NOT_PAID"]);

export const currencySchema = z.enum(["PEN", "USD", "EUR"]);

// ============================================
// Account Schemas
// ============================================

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: accountTypeSchema,
  opening: z.number(),
  currency: currencySchema.optional().default("PEN"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code")
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
  isArchived: z.boolean().optional().default(false),
  creditLimit: z.number().nullable().optional(),
  apr: z.number().min(0).max(100).nullable().optional(),
  billingDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentDueDay: z.number().int().min(1).max(31).nullable().optional(),
  linkToDebt: z.boolean().optional().default(false),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  id: z.string().cuid(),
});

export const getAccountByIdSchema = z.object({
  id: z.string().cuid(),
});

export const listAccountsSchema = z
  .object({
    type: accountTypeSchema.optional(),
    isArchived: z.boolean().optional(),
    sortBy: z.enum(["name", "type", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

export const deleteAccountSchema = z.object({
  id: z.string().cuid(),
});

// ============================================
// Category Schemas
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  monthlyBudget: z.number().nonnegative().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code")
    .nullable()
    .optional(),
  icon: z.string().max(50).nullable().optional(),
  isArchived: z.boolean().optional().default(false),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().cuid(),
});

export const listCategoriesSchema = z
  .object({
    isArchived: z.boolean().optional(),
  })
  .optional();

export const deleteCategorySchema = z.object({
  id: z.string().cuid(),
});

// ============================================
// Expense Schemas
// ============================================

export const createExpenseSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  paymentStatus: paymentStatusSchema.optional().default("PAID"),
  notes: z.string().max(500).nullable().optional(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid().nullable().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  id: z.string().cuid(),
});

export const listExpensesSchema = z
  .object({
    year: z.number().int().optional(),
    month: z.number().int().min(1).max(12).optional(),
    accountId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
    paymentStatus: paymentStatusSchema.optional(),
    sortBy: z.enum(["name", "amount", "date", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

export const deleteExpenseSchema = z.object({
  id: z.string().cuid(),
});

// ============================================
// Income Schemas
// ============================================

export const createIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  notes: z.string().max(500).nullable().optional(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid().nullable().optional(),
});

export const updateIncomeSchema = createIncomeSchema.partial().extend({
  id: z.string().cuid(),
});

export const listIncomesSchema = z
  .object({
    year: z.number().int().optional(),
    month: z.number().int().min(1).max(12).optional(),
    accountId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
    sortBy: z.enum(["name", "amount", "date", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

export const deleteIncomeSchema = z.object({
  id: z.string().cuid(),
});

// ============================================
// Transfer Schemas
// ============================================

export const createTransferSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  notes: z.string().max(500).nullable().optional(),
  fromAccountId: z.string().cuid(),
  toAccountId: z.string().cuid(),
});

export const updateTransferSchema = createTransferSchema.partial().extend({
  id: z.string().cuid(),
});

export const listTransfersSchema = z
  .object({
    year: z.number().int().optional(),
    month: z.number().int().min(1).max(12).optional(),
    accountId: z.string().cuid().optional(),
    sortBy: z.enum(["name", "amount", "date", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

export const deleteTransferSchema = z.object({
  id: z.string().cuid(),
});

// ============================================
// Overview Schemas
// ============================================

export const monthlySummarySchema = z.object({
  year: z.number().int(),
});

export const periodSummarySchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

// ============================================
// Exported types
// ============================================

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ListAccountsInput = z.infer<typeof listAccountsSchema>;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesInput = z.infer<typeof listExpensesSchema>;

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type ListIncomesInput = z.infer<typeof listIncomesSchema>;

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
export type ListTransfersInput = z.infer<typeof listTransfersSchema>;
