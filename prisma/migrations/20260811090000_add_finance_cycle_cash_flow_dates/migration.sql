ALTER TABLE "finance_cycles"
ADD COLUMN "income_day_of_month" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "household_day_of_month" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "flexible_day_of_month" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "debt_day_of_month" INTEGER NOT NULL DEFAULT 1;
