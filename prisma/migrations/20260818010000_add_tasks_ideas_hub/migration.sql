CREATE TYPE "HubTaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELED');

CREATE TYPE "HubTaskPriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE');

CREATE TYPE "HubIdeaStage" AS ENUM ('RAW', 'EXPLORING', 'PRIORITIZED', 'IN_ACTION', 'ARCHIVED');

CREATE TABLE "hub_sequences" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "task_number" INTEGER NOT NULL DEFAULT 0,
    "idea_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hub_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hub_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hub_labels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_labels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hub_tasks" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "HubTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "HubTaskPriority" NOT NULL DEFAULT 'NONE',
    "due_date" TIMESTAMP(3),
    "estimate_points" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "project_id" TEXT,
    "source_idea_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hub_subtasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "task_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_subtasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hub_task_labels" (
    "task_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "hub_task_labels_pkey" PRIMARY KEY ("task_id", "label_id")
);

CREATE TABLE "hub_ideas" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Side Project',
    "stage" "HubIdeaStage" NOT NULL DEFAULT 'RAW',
    "impact" INTEGER NOT NULL DEFAULT 3,
    "effort" INTEGER NOT NULL DEFAULT 2,
    "confidence" INTEGER NOT NULL DEFAULT 4,
    "score" DECIMAL(8,2) NOT NULL DEFAULT 6,
    "tags" TEXT[],
    "target_quarter" TEXT,
    "notes" TEXT,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_ideas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hub_labels_name_key" ON "hub_labels"("name");
CREATE UNIQUE INDEX "hub_tasks_identifier_key" ON "hub_tasks"("identifier");
CREATE UNIQUE INDEX "hub_tasks_source_idea_id_key" ON "hub_tasks"("source_idea_id");
CREATE UNIQUE INDEX "hub_ideas_identifier_key" ON "hub_ideas"("identifier");
CREATE INDEX "hub_projects_name_idx" ON "hub_projects"("name");
CREATE INDEX "hub_tasks_status_due_date_idx" ON "hub_tasks"("status", "due_date");
CREATE INDEX "hub_tasks_project_id_idx" ON "hub_tasks"("project_id");
CREATE INDEX "hub_tasks_priority_idx" ON "hub_tasks"("priority");
CREATE INDEX "hub_subtasks_task_id_position_idx" ON "hub_subtasks"("task_id", "position");
CREATE INDEX "hub_task_labels_label_id_idx" ON "hub_task_labels"("label_id");
CREATE INDEX "hub_ideas_stage_score_idx" ON "hub_ideas"("stage", "score");
CREATE INDEX "hub_ideas_project_id_idx" ON "hub_ideas"("project_id");
CREATE INDEX "hub_ideas_category_idx" ON "hub_ideas"("category");

ALTER TABLE "hub_tasks" ADD CONSTRAINT "hub_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hub_tasks" ADD CONSTRAINT "hub_tasks_source_idea_id_fkey" FOREIGN KEY ("source_idea_id") REFERENCES "hub_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hub_subtasks" ADD CONSTRAINT "hub_subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "hub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hub_task_labels" ADD CONSTRAINT "hub_task_labels_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "hub_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hub_task_labels" ADD CONSTRAINT "hub_task_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "hub_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hub_ideas" ADD CONSTRAINT "hub_ideas_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "hub_sequences" ("id", "task_number", "idea_number") VALUES ('default', 0, 0);
