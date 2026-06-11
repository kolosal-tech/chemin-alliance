-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VisibilityLevel" AS ENUM ('PUBLIC_CONTROLLED', 'AFTER_MATCH', 'AFTER_DIALOGUE', 'AFTER_DISCERNMENT', 'COACH_ONLY', 'PRIVATE', 'MANUAL_SHARE');

-- CreateEnum
CREATE TYPE "FaithVertical" AS ENUM ('CHRISTIAN_EVANGELICAL', 'CHRISTIAN_CATHOLIC', 'OTHER');

-- CreateEnum
CREATE TYPE "AllianceStage" AS ENUM ('DISCOVERY', 'DIALOGUE', 'DISCERNMENT', 'ACCOMPANIMENT', 'COMMITMENT', 'MARRIAGE_PREPARATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContactExchangeStatus" AS ENUM ('NOT_ALLOWED', 'AVAILABLE', 'REQUESTED', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('SAFE', 'BLOCKED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('SENSITIVE_DATA_PROCESSING', 'TERMS_OF_SERVICE', 'COUPLE_COACH_SHARING', 'CONTACT_EXCHANGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "rulesetId" TEXT NOT NULL DEFAULT 'christian_evangelical_default',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "photoUrl" TEXT,
    "photoBlurredByDefault" BOOLEAN NOT NULL DEFAULT true,
    "cityApprox" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaithProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vertical" "FaithVertical" NOT NULL DEFAULT 'CHRISTIAN_EVANGELICAL',
    "denomination" TEXT,
    "ministry" TEXT,
    "engagementFrequency" TEXT,
    "localChurchEncrypted" TEXT,
    "localChurchVisibility" "VisibilityLevel" NOT NULL DEFAULT 'AFTER_DISCERNMENT',
    "testimonyEncrypted" TEXT,
    "testimonyVisibility" "VisibilityLevel" NOT NULL DEFAULT 'AFTER_MATCH',

    CONSTRAINT "FaithProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "childrenVisibility" "VisibilityLevel" NOT NULL DEFAULT 'AFTER_MATCH',
    "wantsChildren" BOOLEAN,
    "acceptsChildren" BOOLEAN,
    "familyVisionEncrypted" TEXT,
    "familyVisionVisibility" "VisibilityLevel" NOT NULL DEFAULT 'AFTER_DIALOGUE',
    "intentionStatement" TEXT,
    "intentionVisibility" "VisibilityLevel" NOT NULL DEFAULT 'PUBLIC_CONTROLLED',

    CONSTRAINT "RelationshipProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "antiMalaiseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "antiMalaiseRadiusKm" INTEGER NOT NULL DEFAULT 25,
    "invisibleMode" BOOLEAN NOT NULL DEFAULT false,
    "fieldVisibility" JSONB,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "stage" "AllianceStage" NOT NULL DEFAULT 'DISCOVERY',
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "compatibilityJson" JSONB,
    "contactExchange" "ContactExchangeStatus" NOT NULL DEFAULT 'NOT_ALLOWED',
    "advanceRequestedBy" TEXT,
    "closedBy" TEXT,
    "closeMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "contentEncrypted" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL DEFAULT 'USER',
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'SAFE',
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllianceAnswer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" "AllianceStage" NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllianceAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "specialties" TEXT[],
    "affiliation" TEXT NOT NULL,
    "bio" TEXT,
    "pricePerSessionEUR" INTEGER NOT NULL,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCoachUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiCoachUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "FaithProfile_userId_key" ON "FaithProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipProfile_userId_key" ON "RelationshipProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_userAId_userBId_key" ON "Match"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "Message_matchId_createdAt_idx" ON "Message"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceAnswer_matchId_userId_questionId_key" ON "AllianceAnswer"("matchId", "userId", "questionId");

-- CreateIndex
CREATE INDEX "Consent_userId_type_idx" ON "Consent"("userId", "type");

-- CreateIndex
CREATE INDEX "Report_targetUserId_status_idx" ON "Report"("targetUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_coachId_slotStart_key" ON "Booking"("coachId", "slotStart");

-- CreateIndex
CREATE UNIQUE INDEX "AiCoachUsage_userId_day_key" ON "AiCoachUsage"("userId", "day");

-- AddForeignKey
ALTER TABLE "FaithProfile" ADD CONSTRAINT "FaithProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipProfile" ADD CONSTRAINT "RelationshipProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllianceAnswer" ADD CONSTRAINT "AllianceAnswer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllianceAnswer" ADD CONSTRAINT "AllianceAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCoachUsage" ADD CONSTRAINT "AiCoachUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

