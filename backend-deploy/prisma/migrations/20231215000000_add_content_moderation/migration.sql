-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'rejected', 'flagged', 'under_review');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('inappropriate_content', 'spam', 'harassment', 'copyright_violation', 'violence', 'hate_speech', 'nudity', 'misinformation', 'other');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('no_action', 'warning', 'content_removal', 'account_suspension', 'account_ban');

-- CreateTable
CREATE TABLE "content_moderation_flags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "content_type" VARCHAR(50) NOT NULL,
    "content_id" UUID NOT NULL,
    "flagged_by" UUID,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "ai_confidence" DECIMAL(5,4),
    "ai_analysis" JSONB DEFAULT '{}',
    "status" "ModerationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "moderator_notes" TEXT,
    "action_taken" "ModerationAction" NOT NULL DEFAULT 'no_action',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_moderation_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reporter_id" UUID NOT NULL,
    "reported_user_id" UUID,
    "content_type" VARCHAR(50),
    "content_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "action_taken" "ModerationAction" NOT NULL DEFAULT 'no_action',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "moderator_id" UUID NOT NULL,
    "action_type" "ModerationAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "duration" INTEGER,
    "content_type" VARCHAR(50),
    "content_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_guidelines" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_guidelines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "content_moderation_flags" ADD CONSTRAINT "content_moderation_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_moderation_flags" ADD CONSTRAINT "content_moderation_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "content_moderation_flags_content_type_content_id_idx" ON "content_moderation_flags"("content_type", "content_id");
CREATE INDEX "content_moderation_flags_status_idx" ON "content_moderation_flags"("status");
CREATE INDEX "content_moderation_flags_created_at_idx" ON "content_moderation_flags"("created_at");
CREATE INDEX "user_reports_status_idx" ON "user_reports"("status");
CREATE INDEX "user_reports_created_at_idx" ON "user_reports"("created_at");
CREATE INDEX "moderation_actions_user_id_idx" ON "moderation_actions"("user_id");
CREATE INDEX "moderation_actions_is_active_idx" ON "moderation_actions"("is_active");