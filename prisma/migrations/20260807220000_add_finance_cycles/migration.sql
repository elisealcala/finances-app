CREATE TYPE "FinanceCycleKind" AS ENUM ('WEEK', 'THREE_MONTHS', 'SIX_MONTHS', 'CUSTOM');

CREATE TYPE "FinanceCycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

CREATE TYPE "FinanceGoalPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TYPE "FinanceGoalStatus" AS ENUM ('ACTIVE', 'FUNDED', 'DEFERRED');

CREATE TABLE "finance_cycles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "FinanceCycleKind" NOT NULL,
    "status" "FinanceCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "display_currency" "Currency" NOT NULL DEFAULT 'USD',
    "opening_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "opening_currency" "Currency" NOT NULL DEFAULT 'USD',
    "monthly_income" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "income_currency" "Currency" NOT NULL DEFAULT 'USD',
    "monthly_household" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "household_currency" "Currency" NOT NULL DEFAULT 'USD',
    "monthly_flexible" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "flexible_currency" "Currency" NOT NULL DEFAULT 'USD',
    "monthly_debt" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "debt_currency" "Currency" NOT NULL DEFAULT 'USD',
    "emergency_floor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "emergency_currency" "Currency" NOT NULL DEFAULT 'USD',
    "income_variance" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "pen_per_usd" DECIMAL(20,8) NOT NULL DEFAULT 3.72,
    "usd_per_eur" DECIMAL(20,8) NOT NULL DEFAULT 1.15,
    "carry_previous" BOOLEAN NOT NULL DEFAULT true,
    "previous_cycle_id" TEXT,
    "closing_amount" DECIMAL(14,2),
    "closing_currency" "Currency",
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_cycles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_cycle_goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "priority" "FinanceGoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FinanceGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "cycle_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_cycle_goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_cycles_status_start_date_idx" ON "finance_cycles"("status", "start_date");

CREATE INDEX "finance_cycles_previous_cycle_id_idx" ON "finance_cycles"("previous_cycle_id");

CREATE INDEX "finance_cycle_goals_cycle_id_position_idx" ON "finance_cycle_goals"("cycle_id", "position");

ALTER TABLE "finance_cycles"
ADD CONSTRAINT "finance_cycles_previous_cycle_id_fkey"
FOREIGN KEY ("previous_cycle_id") REFERENCES "finance_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "finance_cycle_goals"
ADD CONSTRAINT "finance_cycle_goals_cycle_id_fkey"
FOREIGN KEY ("cycle_id") REFERENCES "finance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
