-- CreateEnum
CREATE TYPE "AttachmentStyle" AS ENUM ('ANXIOUS', 'SECURE', 'AVOIDANT');

-- CreateEnum
CREATE TYPE "InsightContext" AS ENUM ('plan_romantico', 'conflicto_tension', 'necesita_espacio', 'sorpresa_detalle', 'comunicacion_importante', 'dia_dificil');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PartnerProfile" ADD COLUMN     "lastMissionReset" TIMESTAMP(3),
ADD COLUMN     "personalityProfileId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PersonalityProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mbtiType" TEXT,
    "mbtiConfidence" JSONB NOT NULL DEFAULT '{}',
    "attachmentStyle" "AttachmentStyle" NOT NULL DEFAULT 'SECURE',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "exploredDims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityInsight" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityProfile_userId_key" ON "PersonalityProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityInsight_cacheKey_key" ON "PersonalityInsight"("cacheKey");

-- AddForeignKey
ALTER TABLE "PersonalityProfile" ADD CONSTRAINT "PersonalityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
