-- CreateTable
CREATE TABLE "EmotionalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dominantEmotion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAuthentic" BOOLEAN,
    "isSuppressed" BOOLEAN NOT NULL DEFAULT false,
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "authenticityLabel" TEXT NOT NULL,
    "rawEmotions" JSONB NOT NULL DEFAULT '{}',
    "phase" "CyclePhase" NOT NULL,
    "environment" TEXT NOT NULL,
    "analysisReliable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmotionalRecord_userId_createdAt_idx" ON "EmotionalRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmotionalRecord_userId_dominantEmotion_idx" ON "EmotionalRecord"("userId", "dominantEmotion");

-- AddForeignKey
ALTER TABLE "EmotionalRecord" ADD CONSTRAINT "EmotionalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
