import { z } from "zod";
import {
  FINANCE_CURRENCIES,
  FINANCE_CYCLE_KINDS,
} from "@/lib/finance-cycle";

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

export const statementStatusSchema = z.enum(["OPEN", "CLOSED", "PAID"]);

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
  secondaryCurrency: currencySchema.nullable().optional(),
  defaultPayingAccountId: z.string().cuid().nullable().optional(),
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
  currency: currencySchema.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid().nullable().optional(),
  payingAccountId: z.string().cuid().nullable().optional(),
  paymentDueDate: z.date().nullable().optional(),
  statementId: z.string().cuid().nullable().optional(),
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
    statementId: z.string().cuid().optional(),
    sortBy: z.enum(["name", "amount", "date", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

export const deleteExpenseSchema = z.object({
  id: z.string().cuid(),
});

export const markExpensePaidSchema = z.object({
  expenseId: z.string().cuid(),
  createTransfer: z.boolean().optional().default(false),
});

// ============================================
// Income Schemas
// ============================================

export const createIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  currency: currencySchema.nullable().optional(),
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

export const incomeCategorySummarySchema = z
  .object({
    accountId: z.string().cuid().optional(),
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
  currency: currencySchema.nullable().optional(),
  rate: z.number().positive().nullable().optional(),
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
// CreditCardStatement Schemas
// ============================================

export const createStatementSchema = z.object({
  accountId: z.string().cuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  billingCloseDate: z.date(),
  paymentDueDate: z.date(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateStatementSchema = z.object({
  id: z.string().cuid(),
  billingCloseDate: z.date().optional(),
  paymentDueDate: z.date().optional(),
  totalAmount: z.number().nullable().optional(),
  status: statementStatusSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const listStatementsSchema = z
  .object({
    accountId: z.string().cuid().optional(),
    year: z.number().int().optional(),
    status: statementStatusSchema.optional(),
    sortBy: z.enum(["year", "month", "createdAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

export const getStatementByIdSchema = z.object({
  id: z.string().cuid(),
});

export const deleteStatementSchema = z.object({
  id: z.string().cuid(),
});

export const closeStatementSchema = z.object({
  id: z.string().cuid(),
});

export const payStatementSchema = z.object({
  id: z.string().cuid(),
  paymentDate: z.date(),
  exchangeRates: z
    .array(
      z.object({
        fromCurrency: currencySchema,
        toCurrency: currencySchema,
        rate: z.number().positive("Exchange rate must be positive"),
      }),
    )
    .optional()
    .default([]),
});

// ============================================
// Overview Schemas
// ============================================

export const monthlySummarySchema = z.object({
  year: z.number().int(),
  currency: currencySchema.optional().default("PEN"),
});

export const periodSummarySchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
  currency: currencySchema.optional().default("PEN"),
});

export const categorySummarySchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).optional(),
  accountId: z.string().cuid().optional(),
});

// ============================================
// Finance cycle schemas
// ============================================

export const financeCycleKindSchema = z.enum(FINANCE_CYCLE_KINDS);
export const financeCycleStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "CLOSED",
  "ARCHIVED",
]);
export const financeGoalPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const financeGoalStatusSchema = z.enum([
  "ACTIVE",
  "FUNDED",
  "DEFERRED",
]);

export const financeCycleGoalSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Goal name is required").max(120),
  amount: z.number().positive("Goal amount must be positive"),
  currency: z.enum(FINANCE_CURRENCIES),
  priority: financeGoalPrioritySchema.default("MEDIUM"),
  status: financeGoalStatusSchema.default("ACTIVE"),
  position: z.number().int().nonnegative().default(0),
});

const financeCycleFieldsSchema = z.object({
  title: z.string().trim().min(1, "Cycle title is required").max(120),
  kind: financeCycleKindSchema,
  status: financeCycleStatusSchema.default("ACTIVE"),
  startDate: z.date(),
  endDate: z.date(),
  displayCurrency: z.enum(FINANCE_CURRENCIES).default("USD"),
  openingAmount: z.number().nonnegative(),
  openingCurrency: z.enum(FINANCE_CURRENCIES),
  monthlyIncome: z.number().nonnegative(),
  incomeCurrency: z.enum(FINANCE_CURRENCIES),
  incomeDayOfMonth: z.number().int().min(1).max(31).default(1),
  monthlyHousehold: z.number().nonnegative(),
  householdCurrency: z.enum(FINANCE_CURRENCIES),
  householdDayOfMonth: z.number().int().min(1).max(31).default(1),
  monthlyFlexible: z.number().nonnegative(),
  flexibleCurrency: z.enum(FINANCE_CURRENCIES),
  flexibleDayOfMonth: z.number().int().min(1).max(31).default(1),
  monthlyDebt: z.number().nonnegative(),
  debtCurrency: z.enum(FINANCE_CURRENCIES),
  debtDayOfMonth: z.number().int().min(1).max(31).default(1),
  emergencyFloor: z.number().nonnegative(),
  emergencyCurrency: z.enum(FINANCE_CURRENCIES),
  incomeVariance: z.number().min(0).max(100),
  penPerUsd: z.number().positive(),
  usdPerEur: z.number().positive(),
  carryPrevious: z.boolean().default(true),
  previousCycleId: z.string().cuid().nullable().optional(),
  goals: z.array(financeCycleGoalSchema).max(50).default([]),
});

export const createFinanceCycleSchema = financeCycleFieldsSchema.refine(
  (input) => input.endDate > input.startDate,
  { message: "Cycle end date must be after its start date", path: ["endDate"] },
);

export const updateFinanceCycleSchema = financeCycleFieldsSchema
  .extend({ id: z.string().cuid() })
  .refine((input) => input.endDate > input.startDate, {
    message: "Cycle end date must be after its start date",
    path: ["endDate"],
  });

export const listFinanceCyclesSchema = z
  .object({
    status: financeCycleStatusSchema.optional(),
  })
  .optional();

export const closeFinanceCycleSchema = z.object({ id: z.string().cuid() });

// ============================================
// Exported types
// ============================================

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ListAccountsInput = z.infer<typeof listAccountsSchema>;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;
export type CategorySummaryInput = z.infer<typeof categorySummarySchema>;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesInput = z.infer<typeof listExpensesSchema>;

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type ListIncomesInput = z.infer<typeof listIncomesSchema>;
export type IncomeCategorySummaryInput = z.infer<
  typeof incomeCategorySummarySchema
>;

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
export type ListTransfersInput = z.infer<typeof listTransfersSchema>;

export type CreateStatementInput = z.infer<typeof createStatementSchema>;
export type UpdateStatementInput = z.infer<typeof updateStatementSchema>;
export type ListStatementsInput = z.infer<typeof listStatementsSchema>;
export type MarkExpensePaidInput = z.infer<typeof markExpensePaidSchema>;
export type PayStatementInput = z.infer<typeof payStatementSchema>;
export type CreateFinanceCycleInput = z.infer<
  typeof createFinanceCycleSchema
>;
export type UpdateFinanceCycleInput = z.infer<
  typeof updateFinanceCycleSchema
>;
export type ListFinanceCyclesInput = z.infer<typeof listFinanceCyclesSchema>;
