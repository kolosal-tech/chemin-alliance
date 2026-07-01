-- Jeu de couple/match (construction C, hybride, SANS FIN).
-- Deux tables polymorphes : GameRound (rattaché à un Match XOR un Espace Couple)
-- et GameRoundAnswer (réponse/devinette chiffrée d'un joueur). Additif pur.
-- Le build Vercel n'exécute PAS `migrate deploy` → appliquer ce SQL manuellement
-- dans Supabase (SQL Editor) AVANT de déployer le code qui l'utilise.

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('SHARED', 'GUESS');

-- CreateEnum
CREATE TYPE "GameRoundStatus" AS ENUM ('OPEN', 'REVEALED');

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "coupleSpaceId" TEXT,
    "mode" "GameMode" NOT NULL,
    "questionKey" TEXT,
    "questionText" TEXT,
    "initiatorId" TEXT NOT NULL,
    "status" "GameRoundStatus" NOT NULL DEFAULT 'OPEN',
    "resultMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRoundAnswer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answerEncrypted" TEXT,
    "guessEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRoundAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameRound_matchId_createdAt_idx" ON "GameRound"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "GameRound_coupleSpaceId_createdAt_idx" ON "GameRound"("coupleSpaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameRoundAnswer_roundId_userId_key" ON "GameRoundAnswer"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_coupleSpaceId_fkey" FOREIGN KEY ("coupleSpaceId") REFERENCES "CoupleSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundAnswer" ADD CONSTRAINT "GameRoundAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundAnswer" ADD CONSTRAINT "GameRoundAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
