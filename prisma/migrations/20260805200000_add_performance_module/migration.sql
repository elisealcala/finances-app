-- CreateEnum
CREATE TYPE "PerformanceCycleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PerformanceMeasurementMode" AS ENUM ('NUMBER', 'PERCENTAGE', 'MILESTONE', 'BOOLEAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "PerformanceConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "performance_cycles" (
    "id" TEXT NOT NULL,
    "desired_result" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "PerformanceCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_outcomes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "impact" TEXT,
    "weight" DECIMAL(7,2) NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "cycle_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_key_results" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "measurement_mode" "PerformanceMeasurementMode" NOT NULL,
    "baseline" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "target" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "weight" DECIMAL(7,2) NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "outcome_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_progress_updates" (
    "id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DECIMAL(14,4),
    "progress_percent" DECIMAL(5,2),
    "confidence" "PerformanceConfidence" NOT NULL DEFAULT 'MEDIUM',
    "summary" TEXT NOT NULL,
    "blocker" TEXT,
    "next_action" TEXT,
    "evidence_label" TEXT,
    "evidence_url" TEXT,
    "key_result_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_cycles_status_start_date_idx" ON "performance_cycles"("status", "start_date");

-- CreateIndex
CREATE INDEX "performance_outcomes_cycle_id_position_idx" ON "performance_outcomes"("cycle_id", "position");

-- CreateIndex
CREATE INDEX "performance_key_results_outcome_id_position_idx" ON "performance_key_results"("outcome_id", "position");

-- CreateIndex
CREATE INDEX "performance_progress_updates_key_result_id_recorded_at_idx" ON "performance_progress_updates"("key_result_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "performance_outcomes" ADD CONSTRAINT "performance_outcomes_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_key_results" ADD CONSTRAINT "performance_key_results_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "performance_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_progress_updates" ADD CONSTRAINT "performance_progress_updates_key_result_id_fkey" FOREIGN KEY ("key_result_id") REFERENCES "performance_key_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
