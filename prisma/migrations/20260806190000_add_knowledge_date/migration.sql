ALTER TABLE "knowledge_documents" ADD COLUMN "date" TIMESTAMP(3);

UPDATE "knowledge_documents" SET "date" = "modified_at";

ALTER TABLE "knowledge_documents" ALTER COLUMN "date" SET NOT NULL;

CREATE INDEX "knowledge_documents_deleted_at_date_idx"
ON "knowledge_documents"("deleted_at", "date");
