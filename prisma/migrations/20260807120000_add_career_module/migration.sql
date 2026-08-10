ALTER TYPE "PerformanceCycleStatus" ADD VALUE 'DRAFT' BEFORE 'ACTIVE';
ALTER TYPE "PerformanceCycleStatus" ADD VALUE 'UPCOMING' BEFORE 'ACTIVE';

CREATE TYPE "CareerOutputKind" AS ENUM ('METRIC', 'MILESTONE', 'FORM', 'GITHUB_REPOSITORY', 'GITHUB_PULL_REQUEST', 'LINK', 'FILE', 'MANUAL');
CREATE TYPE "CareerEvaluationStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'OVERRIDDEN');
CREATE TYPE "CareerOpportunityStatus" AS ENUM ('DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED');
CREATE TYPE "CareerResumeSource" AS ENUM ('MANUAL', 'AI');

ALTER TABLE "performance_cycles"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT;

ALTER TABLE "performance_outcomes"
  ADD COLUMN "weight_rationale" TEXT;

ALTER TABLE "performance_key_results"
  ADD COLUMN "weight_rationale" TEXT,
  ADD COLUMN "output_kind" "CareerOutputKind" NOT NULL DEFAULT 'METRIC',
  ADD COLUMN "configuration" JSONB,
  ADD COLUMN "rubric" JSONB;

CREATE TABLE "career_output_submissions" (
  "id" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kind" "CareerOutputKind" NOT NULL,
  "label" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "data" JSONB NOT NULL,
  "snapshot_hash" TEXT,
  "key_result_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "career_output_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_evaluations" (
  "id" TEXT NOT NULL,
  "status" "CareerEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
  "score" DECIMAL(5,2) NOT NULL,
  "grade" TEXT,
  "summary" TEXT NOT NULL,
  "strengths" TEXT[] NOT NULL,
  "improvements" TEXT[] NOT NULL,
  "criterion_scores" JSONB NOT NULL,
  "citations" JSONB NOT NULL,
  "model" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "accepted_progress_update_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at" TIMESTAMP(3),
  CONSTRAINT "career_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_progress_snapshots" (
  "id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "progress" DECIMAL(5,2) NOT NULL,
  "expected_progress" DECIMAL(5,2) NOT NULL,
  "scope_weight" DECIMAL(9,2) NOT NULL,
  "source" TEXT NOT NULL,
  "cycle_id" TEXT NOT NULL,
  CONSTRAINT "career_progress_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_profiles" (
  "id" TEXT NOT NULL DEFAULT 'career-profile',
  "full_name" TEXT NOT NULL DEFAULT '',
  "headline" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "location" TEXT NOT NULL DEFAULT '',
  "website" TEXT,
  "github_url" TEXT,
  "linkedin_url" TEXT,
  "summary" TEXT NOT NULL DEFAULT '',
  "skills" TEXT[] NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "career_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_experiences" (
  "id" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "location" TEXT,
  "employment_type" TEXT,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "current" BOOLEAN NOT NULL DEFAULT false,
  "summary" TEXT,
  "achievements" TEXT[] NOT NULL,
  "skills" TEXT[] NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "career_experiences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_education" (
  "id" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "degree" TEXT NOT NULL,
  "field" TEXT,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "details" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "career_education_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_projects" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "url" TEXT,
  "github_url" TEXT,
  "highlights" TEXT[] NOT NULL,
  "skills" TEXT[] NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "career_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_opportunities" (
  "id" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "url" TEXT,
  "job_description" TEXT NOT NULL,
  "status" "CareerOpportunityStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "career_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_resumes" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "template" TEXT NOT NULL DEFAULT 'ats',
  "opportunity_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "career_resumes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "career_resume_versions" (
  "id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "source_map" JSONB,
  "source" "CareerResumeSource" NOT NULL DEFAULT 'MANUAL',
  "model" TEXT,
  "prompt_version" TEXT,
  "resume_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "career_resume_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "career_output_submissions_key_result_id_submitted_at_idx" ON "career_output_submissions"("key_result_id", "submitted_at");
CREATE UNIQUE INDEX "career_evaluations_accepted_progress_update_id_key" ON "career_evaluations"("accepted_progress_update_id");
CREATE INDEX "career_evaluations_submission_id_created_at_idx" ON "career_evaluations"("submission_id", "created_at");
CREATE INDEX "career_progress_snapshots_cycle_id_recorded_at_idx" ON "career_progress_snapshots"("cycle_id", "recorded_at");
CREATE INDEX "career_experiences_position_start_date_idx" ON "career_experiences"("position", "start_date");
CREATE INDEX "career_education_position_idx" ON "career_education"("position");
CREATE INDEX "career_projects_position_idx" ON "career_projects"("position");
CREATE INDEX "career_opportunities_status_created_at_idx" ON "career_opportunities"("status", "created_at");
CREATE INDEX "career_resumes_opportunity_id_updated_at_idx" ON "career_resumes"("opportunity_id", "updated_at");
CREATE UNIQUE INDEX "career_resume_versions_resume_id_version_key" ON "career_resume_versions"("resume_id", "version");
CREATE INDEX "career_resume_versions_resume_id_created_at_idx" ON "career_resume_versions"("resume_id", "created_at");

ALTER TABLE "career_output_submissions" ADD CONSTRAINT "career_output_submissions_key_result_id_fkey" FOREIGN KEY ("key_result_id") REFERENCES "performance_key_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_evaluations" ADD CONSTRAINT "career_evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "career_output_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_evaluations" ADD CONSTRAINT "career_evaluations_accepted_progress_update_id_fkey" FOREIGN KEY ("accepted_progress_update_id") REFERENCES "performance_progress_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "career_progress_snapshots" ADD CONSTRAINT "career_progress_snapshots_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_resumes" ADD CONSTRAINT "career_resumes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "career_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "career_resume_versions" ADD CONSTRAINT "career_resume_versions_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "career_resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
