-- AlterTable: Add per-payment fees to DebtPayment
ALTER TABLE "debt_payments" ADD COLUMN "new_fees" JSON;
