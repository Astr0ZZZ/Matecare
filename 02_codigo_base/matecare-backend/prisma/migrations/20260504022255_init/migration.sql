-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PersonalityType" AS ENUM ('INTROVERTED', 'EXTROVERTED', 'AMBIVERT');

-- CreateEnum
CREATE TYPE "SocialLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('VERY_PRIVATE', 'MODERATE', 'OPEN');

-- CreateEnum
CREATE TYPE "ConflictStyle" AS ENUM ('AVOIDANT', 'DIRECT', 'PASSIVE');

-- CreateEnum
CREATE TYPE "AffectionStyle" AS ENUM ('PHYSICAL', 'VERBAL', 'ACTS', 'QUALITY');

-- CreateEnum
CREATE TYPE "CyclePhase" AS ENUM ('MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('PHASE_CHANGE', 'DAILY_TIP', 'PERIOD_SOON', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleLength" INTEGER NOT NULL,
    "periodDuration" INTEGER NOT NULL,
    "lastPeriodDate" TIMESTAMP(3) NOT NULL,
    "isIrregular" BOOLEAN NOT NULL DEFAULT false,
    "irregularRange" INTEGER,
    "personalityType" "PersonalityType" NOT NULL,
    "socialLevel" "SocialLevel" NOT NULL,
    "privacyLevel" "PrivacyLevel" NOT NULL,
    "conflictStyle" "ConflictStyle" NOT NULL,
    "affectionStyle" "AffectionStyle" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "phase" "CyclePhase" NOT NULL,
    "dayOfCycle" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CycleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userInput" TEXT,
    "aiResponse" TEXT NOT NULL,
    "phaseContext" "CyclePhase" NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "opened" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_userId_key" ON "PartnerProfile"("userId");

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleLog" ADD CONSTRAINT "CycleLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PartnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
