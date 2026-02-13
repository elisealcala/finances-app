-- AlterTable: Add original_balance column, backfill from existing balance
ALTER TABLE "debts" ADD COLUMN "original_balance" DECIMAL(12,2);
UPDATE "debts" SET "original_balance" = "balance";
ALTER TABLE "debts" ALTER COLUMN "original_balance" SET NOT NULL;

-- CreateTable
CREATE TABLE "debt_payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "debt_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_payments_debt_id_idx" ON "debt_payments"("debt_id");

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
