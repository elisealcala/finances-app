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

export const debtFeeInputSchema = z.object({
  name: z.string().min(1, "Fee name is required").max(50),
  amount: z.number().positive("Fee amount must be positive"),
});

export const capitalPaymentInputSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  notes: z.string().max(200).nullable().optional(),
  newMonthlyCapital: z.number().nonnegative().nullable().optional(),
  newMonthlyInterest: z.number().nonnegative().nullable().optional(),
  newFees: z.array(debtFeeInputSchema).nullable().optional(),
});

export const installmentInputSchema = z.object({
  installmentNumber: z.number().int().positive(),
  dueDate: z.date(),
  capital: z.number().nonnegative(),
  interest: z.number().nonnegative(),
  fees: z.array(debtFeeInputSchema).optional(),
  notes: z.string().max(200).nullable().optional(),
});

export const createDebtSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: debtTypeSchema,
  balance: z.number().nonnegative("Balance must be non-negative"),
  interestRate: z
    .number()
    .min(0, "Interest rate must be non-negative")
    .max(100, "Interest rate cannot exceed 100%"),
  monthlyCapital: z
    .number()
    .nonnegative("Monthly capital must be non-negative"),
  monthlyInterest: z
    .number()
    .nonnegative("Monthly interest must be non-negative"),
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
  fees: z.array(debtFeeInputSchema).optional(),
  capitalPayments: z.array(capitalPaymentInputSchema).optional(),
  hasSchedule: z.boolean().optional().default(false),
  termMonths: z.number().int().positive().nullable().optional(),
  installments: z.array(installmentInputSchema).optional(),
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

export const addPaymentSchema = z.object({
  debtId: z.string().cuid(),
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  notes: z.string().max(200).nullable().optional(),
  newMonthlyCapital: z.number().nonnegative().nullable().optional(),
  newMonthlyInterest: z.number().nonnegative().nullable().optional(),
  newFees: z.array(debtFeeInputSchema).nullable().optional(),
});

export const deletePaymentSchema = z.object({
  id: z.string().cuid(),
});

export const markInstallmentPaidSchema = z.object({
  id: z.string().cuid(),
  paidAt: z.date().optional(),
});

export const markInstallmentUnpaidSchema = z.object({
  id: z.string().cuid(),
});

export const addScheduleCapitalPaymentSchema = z
  .object({
    debtId: z.string().cuid(),
    amount: z.number().positive("Payment amount must be positive"),
    date: z.date(),
    notes: z.string().max(200).nullable().optional(),
    mode: z.enum(["auto", "custom"]),
    termOption: z.enum(["reduce_payment", "reduce_term"]).optional(),
    newTermMonths: z.number().int().positive().optional(),
    customInstallments: z.array(installmentInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "auto" && !data.termOption) {
      ctx.addIssue({
        code: "custom",
        path: ["termOption"],
        message: "Term option is required for auto mode",
      });
    }
    if (
      data.mode === "auto" &&
      data.termOption === "reduce_term" &&
      !data.newTermMonths
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["newTermMonths"],
        message: "New term months is required for reduce term",
      });
    }
    if (data.mode === "custom" && !data.customInstallments?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["customInstallments"],
        message: "At least one installment is required",
      });
    }
  });

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type ListDebtsInput = z.infer<typeof listDebtsSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type CapitalPaymentInput = z.infer<typeof capitalPaymentInputSchema>;
export type InstallmentInput = z.infer<typeof installmentInputSchema>;
export type AddScheduleCapitalPaymentInput = z.infer<typeof addScheduleCapitalPaymentSchema>;
