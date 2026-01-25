-- CreateTable
CREATE TABLE "credit_purchases" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "total_cost" INTEGER NOT NULL,
    "payment_processor_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_purchases_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "credit_purchases_user_id_idx" ON "credit_purchases"("user_id");
CREATE INDEX "credit_purchases_status_idx" ON "credit_purchases"("status");
CREATE INDEX "credit_purchases_created_at_idx" ON "credit_purchases"("created_at");