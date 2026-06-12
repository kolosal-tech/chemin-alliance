-- CreateEnum
CREATE TYPE "LifeSeason" AS ENUM ('JOURNEY', 'MARRIED', 'PARENTS');

-- CreateEnum
CREATE TYPE "CoupleSpaceStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "AgentInsight" ADD COLUMN     "coupleSpaceId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "season" "LifeSeason" NOT NULL DEFAULT 'JOURNEY';

-- CreateTable
CREATE TABLE "CoupleSpace" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT,
    "status" "CoupleSpaceStatus" NOT NULL DEFAULT 'PENDING',
    "origin" TEXT NOT NULL DEFAULT 'EXTERNAL',
    "matchId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "season" "LifeSeason" NOT NULL DEFAULT 'MARRIED',
    "marriedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoupleSpace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoupleSpace_userAId_key" ON "CoupleSpace"("userAId");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleSpace_userBId_key" ON "CoupleSpace"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleSpace_inviteCode_key" ON "CoupleSpace"("inviteCode");

-- AddForeignKey
ALTER TABLE "CoupleSpace" ADD CONSTRAINT "CoupleSpace_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleSpace" ADD CONSTRAINT "CoupleSpace_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

