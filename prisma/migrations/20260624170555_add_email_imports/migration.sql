-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('RECEIPT', 'ANALYSIS', 'OTHER');

-- CreateEnum
CREATE TYPE "PendingImportStatus" AS ENUM ('PENDING', 'IMPORTED', 'DISMISSED');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "card_last_4" VARCHAR(4);

-- CreateTable
CREATE TABLE "doctor_appointments" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "specialty" TEXT NOT NULL,
    "doctor_name" TEXT,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "appointment_id" TEXT NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER',
    "appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_credentials" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_polled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_imports" (
    "id" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "email_message_id" TEXT NOT NULL,
    "email_date" TIMESTAMP(3) NOT NULL,
    "raw_subject" TEXT NOT NULL,
    "raw_snippet" TEXT,
    "merchant" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "card_last_4" VARCHAR(4),
    "account_id" TEXT,
    "match_warning" TEXT,
    "status" "PendingImportStatus" NOT NULL DEFAULT 'PENDING',
    "imported_expense_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "content" JSON NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doctor_appointments_date_idx" ON "doctor_appointments"("date");

-- CreateIndex
CREATE INDEX "medications_appointment_id_idx" ON "medications"("appointment_id");

-- CreateIndex
CREATE INDEX "attachments_appointment_id_idx" ON "attachments"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_credentials_email_key" ON "gmail_credentials"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pending_imports_email_message_id_key" ON "pending_imports"("email_message_id");

-- CreateIndex
CREATE INDEX "pending_imports_status_idx" ON "pending_imports"("status");

-- CreateIndex
CREATE INDEX "pending_imports_email_date_idx" ON "pending_imports"("email_date");

-- CreateIndex
CREATE INDEX "notes_date_idx" ON "notes"("date");

-- CreateIndex
CREATE INDEX "accounts_card_last_4_idx" ON "accounts"("card_last_4");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "doctor_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "doctor_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_imports" ADD CONSTRAINT "pending_imports_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
