-- CreateEnum
CREATE TYPE "AssistantRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "assistant_messages" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "role" "AssistantRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_alert_logs" (
    "id" TEXT NOT NULL,
    "alert_key" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_messages_chat_id_created_at_idx" ON "assistant_messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "assistant_alert_logs_sent_at_idx" ON "assistant_alert_logs"("sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_alert_logs_alert_key_period_key_key" ON "assistant_alert_logs"("alert_key", "period_key");
