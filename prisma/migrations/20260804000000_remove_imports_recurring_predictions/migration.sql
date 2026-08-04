-- DropTable
DROP TABLE "pending_imports";

-- DropTable
DROP TABLE "gmail_credentials";

-- DropTable
DROP TABLE "assistant_alert_logs";

-- DropTable
DROP TABLE "funding_links";

-- DropTable
DROP TABLE "recurring_transactions";

-- DropIndex
DROP INDEX "accounts_card_last_4_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "card_last_4";

-- DropEnum
DROP TYPE "PendingImportStatus";

-- DropEnum
DROP TYPE "RecurringFrequency";

-- DropEnum
DROP TYPE "RecurringType";
