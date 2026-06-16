-- Passage unilatéral (gratuit à vie) : j'exclus un profil de MES suggestions.
CREATE TABLE "Pass" (
    "id" TEXT NOT NULL,
    "passerId" TEXT NOT NULL,
    "passedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Pass_passerId_passedId_key" ON "Pass"("passerId", "passedId");
CREATE INDEX "Pass_passedId_idx" ON "Pass"("passedId");
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_passerId_fkey" FOREIGN KEY ("passerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_passedId_fkey" FOREIGN KEY ("passedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Suivi des messages lus (badges non-lus).
ALTER TABLE "Match" ADD COLUMN "lastReadAtUserA" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN "lastReadAtUserB" TIMESTAMP(3);
CREATE INDEX "Match_userAId_lastReadAtUserA_idx" ON "Match"("userAId", "lastReadAtUserA");
CREATE INDEX "Match_userBId_lastReadAtUserB_idx" ON "Match"("userBId", "lastReadAtUserB");

-- TTL du jeton de vérification d'email (changement d'email).
ALTER TABLE "User" ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);
