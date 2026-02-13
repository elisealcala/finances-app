-- AlterTable: Add monthly payment breakdown fields to Debt
ALTER TABLE "debts" ADD COLUMN "monthly_capital" DECIMAL(10,2);
ALTER TABLE "debts" ADD COLUMN "monthly_interest" DECIMAL(10,2);
ALTER TABLE "debts" ADD COLUMN "original_monthly_capital" DECIMAL(10,2);
ALTER TABLE "debts" ADD COLUMN "original_monthly_interest" DECIMAL(10,2);

-- Backfill: assume entire payment is capital (interest=0) for existing rows
UPDATE "debts" SET
  "monthly_capital" = "minimum_payment",
  "monthly_interest" = 0,
  "original_monthly_capital" = "original_minimum_payment",
  "original_monthly_interest" = 0;

-- Set NOT NULL after backfill
ALTER TABLE "debts" ALTER COLUMN "monthly_capital" SET NOT NULL;
ALTER TABLE "debts" ALTER COLUMN "monthly_interest" SET NOT NULL;
ALTER TABLE "debts" ALTER COLUMN "original_monthly_capital" SET NOT NULL;
ALTER TABLE "debts" ALTER COLUMN "original_monthly_interest" SET NOT NULL;

-- AlterTable: Add breakdown fields to DebtPayment
ALTER TABLE "debt_payments" ADD COLUMN "new_monthly_capital" DECIMAL(10,2);
ALTER TABLE "debt_payments" ADD COLUMN "new_monthly_interest" DECIMAL(10,2);

-- Backfill: for payments that changed monthly, assume all went to capital
UPDATE "debt_payments" SET
  "new_monthly_capital" = "new_minimum_payment",
  "new_monthly_interest" = 0
WHERE "new_minimum_payment" IS NOT NULL;
