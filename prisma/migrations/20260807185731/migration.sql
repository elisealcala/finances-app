-- AlterTable
ALTER TABLE "career_evaluations" ALTER COLUMN "criterion_scores" SET DATA TYPE JSON,
ALTER COLUMN "citations" SET DATA TYPE JSON;

-- AlterTable
ALTER TABLE "career_output_submissions" ALTER COLUMN "data" SET DATA TYPE JSON;

-- AlterTable
ALTER TABLE "career_resume_versions" ALTER COLUMN "content" SET DATA TYPE JSON,
ALTER COLUMN "source_map" SET DATA TYPE JSON;

-- AlterTable
ALTER TABLE "performance_key_results" ALTER COLUMN "configuration" SET DATA TYPE JSON,
ALTER COLUMN "rubric" SET DATA TYPE JSON;

-- RenameIndex
ALTER INDEX "performance_progress_knowledge_links_progress_update_id_documen" RENAME TO "performance_progress_knowledge_links_progress_update_id_doc_key";
