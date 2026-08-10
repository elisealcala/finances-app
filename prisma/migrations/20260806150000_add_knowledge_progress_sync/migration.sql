CREATE TYPE "PerformanceKnowledgeRelation" AS ENUM ('LEARNING', 'DECISION', 'REFERENCE', 'EVIDENCE');
CREATE TYPE "PerformanceKnowledgeSignalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED', 'SUPERSEDED');

CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "source_id" TEXT,
    "relative_path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "frontmatter" JSONB NOT NULL,
    "pillar" TEXT,
    "content_hash" TEXT NOT NULL,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_document_tags" (
    "document_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_document_tags_pkey" PRIMARY KEY ("document_id", "tag")
);

CREATE TABLE "performance_outcome_knowledge_tags" (
    "outcome_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_outcome_knowledge_tags_pkey" PRIMARY KEY ("outcome_id", "tag")
);

INSERT INTO "performance_outcome_knowledge_tags" ("outcome_id", "tag")
SELECT "id", 'career-performance' FROM "performance_outcomes";

CREATE TABLE "performance_knowledge_signals" (
    "id" TEXT NOT NULL,
    "signal_key" TEXT NOT NULL,
    "status" "PerformanceKnowledgeSignalStatus" NOT NULL DEFAULT 'PENDING',
    "relation" "PerformanceKnowledgeRelation" NOT NULL DEFAULT 'REFERENCE',
    "matched_tags" TEXT[] NOT NULL,
    "suggested_summary" TEXT NOT NULL,
    "document_content_hash" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "outcome_id" TEXT NOT NULL,
    "key_result_id" TEXT,
    "accepted_update_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "performance_knowledge_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performance_progress_knowledge_links" (
    "id" TEXT NOT NULL,
    "progress_update_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_content_hash" TEXT NOT NULL,
    "relation" "PerformanceKnowledgeRelation" NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "path_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_progress_knowledge_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_documents_source_id_key" ON "knowledge_documents"("source_id");
CREATE UNIQUE INDEX "knowledge_documents_relative_path_key" ON "knowledge_documents"("relative_path");
CREATE INDEX "knowledge_documents_deleted_at_modified_at_idx" ON "knowledge_documents"("deleted_at", "modified_at");
CREATE INDEX "knowledge_documents_pillar_deleted_at_idx" ON "knowledge_documents"("pillar", "deleted_at");
CREATE INDEX "knowledge_document_tags_tag_idx" ON "knowledge_document_tags"("tag");
CREATE INDEX "performance_outcome_knowledge_tags_tag_idx" ON "performance_outcome_knowledge_tags"("tag");
CREATE UNIQUE INDEX "performance_knowledge_signals_signal_key_key" ON "performance_knowledge_signals"("signal_key");
CREATE UNIQUE INDEX "performance_knowledge_signals_accepted_update_id_key" ON "performance_knowledge_signals"("accepted_update_id");
CREATE INDEX "performance_knowledge_signals_outcome_id_status_created_at_idx" ON "performance_knowledge_signals"("outcome_id", "status", "created_at");
CREATE INDEX "performance_knowledge_signals_document_id_status_idx" ON "performance_knowledge_signals"("document_id", "status");
CREATE UNIQUE INDEX "performance_progress_knowledge_links_progress_update_id_document_id_key" ON "performance_progress_knowledge_links"("progress_update_id", "document_id");
CREATE INDEX "performance_progress_knowledge_links_document_id_idx" ON "performance_progress_knowledge_links"("document_id");

ALTER TABLE "knowledge_document_tags" ADD CONSTRAINT "knowledge_document_tags_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_outcome_knowledge_tags" ADD CONSTRAINT "performance_outcome_knowledge_tags_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "performance_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_knowledge_signals" ADD CONSTRAINT "performance_knowledge_signals_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_knowledge_signals" ADD CONSTRAINT "performance_knowledge_signals_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "performance_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_knowledge_signals" ADD CONSTRAINT "performance_knowledge_signals_key_result_id_fkey" FOREIGN KEY ("key_result_id") REFERENCES "performance_key_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "performance_knowledge_signals" ADD CONSTRAINT "performance_knowledge_signals_accepted_update_id_fkey" FOREIGN KEY ("accepted_update_id") REFERENCES "performance_progress_updates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "performance_progress_knowledge_links" ADD CONSTRAINT "performance_progress_knowledge_links_progress_update_id_fkey" FOREIGN KEY ("progress_update_id") REFERENCES "performance_progress_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "performance_progress_knowledge_links" ADD CONSTRAINT "performance_progress_knowledge_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
