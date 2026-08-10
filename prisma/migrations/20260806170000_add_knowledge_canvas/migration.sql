ALTER TABLE "knowledge_documents"
ADD COLUMN "canvas" JSONB,
ADD COLUMN "canvas_hash" TEXT,
ADD COLUMN "canvas_modified_at" TIMESTAMP(3);
