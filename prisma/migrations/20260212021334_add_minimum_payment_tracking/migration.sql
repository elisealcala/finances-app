-- AlterTable: Add optional new_minimum_payment to debt_payments
ALTER TABLE "debt_payments" ADD COLUMN "new_minimum_payment" DECIMAL(10,2);

-- AlterTable: Add original_minimum_payment to debts (backfill from current minimum_payment)
ALTER TABLE "debts" ADD COLUMN "original_minimum_payment" DECIMAL(10,2);
UPDATE "debts" SET "original_minimum_payment" = "minimum_payment";
ALTER TABLE "debts" ALTER COLUMN "original_minimum_payment" SET NOT NULL;
