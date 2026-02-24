-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "default_paying_account_id" TEXT,
ADD COLUMN     "secondary_currency" "Currency";

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "currency" "Currency",
ADD COLUMN     "paying_account_id" TEXT,
ADD COLUMN     "payment_due_date" TIMESTAMP(3),
ADD COLUMN     "statement_id" TEXT;

-- CreateTable
CREATE TABLE "credit_card_statements" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "billing_close_date" TIMESTAMP(3) NOT NULL,
    "payment_due_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(12,2),
    "status" "StatementStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_card_statements_account_id_idx" ON "credit_card_statements"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_statements_account_id_month_year_key" ON "credit_card_statements"("account_id", "month", "year");

-- CreateIndex
CREATE INDEX "expenses_statement_id_idx" ON "expenses"("statement_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_default_paying_account_id_fkey" FOREIGN KEY ("default_paying_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paying_account_id_fkey" FOREIGN KEY ("paying_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "credit_card_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_statements" ADD CONSTRAINT "credit_card_statements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
