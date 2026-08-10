-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "debt_installment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "expenses_debt_installment_id_key" ON "expenses"("debt_installment_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_debt_installment_id_fkey" FOREIGN KEY ("debt_installment_id") REFERENCES "debt_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
