-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "has_schedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "term_months" INTEGER;

-- CreateTable
CREATE TABLE "debt_installments" (
    "id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "capital" DECIMAL(10,2) NOT NULL,
    "interest" DECIMAL(10,2) NOT NULL,
    "fees" JSON,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "debt_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_installments_debt_id_idx" ON "debt_installments"("debt_id");

-- CreateIndex
CREATE UNIQUE INDEX "debt_installments_debt_id_installment_number_key" ON "debt_installments"("debt_id", "installment_number");

-- AddForeignKey
ALTER TABLE "debt_installments" ADD CONSTRAINT "debt_installments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
